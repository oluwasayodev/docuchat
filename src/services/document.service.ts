import {inject, injectable} from "tsyringe";
import {
    DocumentDownload, DocumentSearchResult,
    DocumentWithUrl,
    IDocumentService,
    UploadDocumentData,
    UploadedFile
} from "./documentService.interface";
import {IDocumentRepository, ListDocumentQuery} from "../repositories/documentRepository.interface";
import {IStorageService} from "../storage/storageService.interface";
import {IJobQueue} from "../queues/jobQueue.interface";
import {IEventBus} from "../events/eventBus.interface";
import {ILogger} from "../logging/logger.interface";
import {Page} from "../types/pagination.type";
import {MIME_TYPE_EXTENSIONS, resolveDocumentMimeType} from "../constants/document.constants";
import {BadRequestException, ConflictException, InternalServerError, NotFoundError} from "../errors/http.error";
import {randomUUID} from "node:crypto";
import {QUEUES} from "../queues/queue.constants";
import {Document, DocumentChunk} from "../types/document.types";
import {DOCUMENT_EVENTS} from "../events/types/document.events";
import {IChunkStore, SearchChunkResult} from "../stores/chunkStore.interface";
import {error, query} from "winston";
import {AppConfig} from "../lib/config";
import {IEmbeddingModelFactory} from "../models/embedding/embeddingModel.factory";
import {IUsageLogRepository} from "../repositories/usageLogRepository.interface";
import {currentLogContext} from "../logging/logContext";


@injectable()
export class DocumentService implements IDocumentService {

    constructor(
        @inject("IDocumentRepository") private readonly documentRepository: IDocumentRepository,
        @inject("IStorageService") private readonly storage: IStorageService,
        @inject("IJobQueue") private readonly jobQueue: IJobQueue,
        @inject("IEventBus") private readonly eventBus: IEventBus,
        @inject("ILogger") private readonly logger: ILogger,
        @inject("IChunkStore") private readonly chunkStore: IChunkStore,
        @inject("IEmbeddingModelFactory") private readonly embeddingModelFactory: IEmbeddingModelFactory,
        @inject("IUsageLogRepository") private readonly usageLogRepository: IUsageLogRepository,
        @inject(AppConfig) private readonly config: AppConfig,
    ) {}


    async findOwnById(userId: string, id: string): Promise<Document> {
        const document = await this.documentRepository.findOwnById(userId, id);
        if (!document) {
            throw new NotFoundError("Document not found.");
        }
        return document;
    }

    async getDownload(userId: string, id: string): Promise<DocumentDownload> {
        const document = await this.findOwnById(userId, id);
        const buffer = await this.storage.getBuffer(document.storageKey);
        return {document, buffer, mimeType: document.mimeType};
    }

    async getWithUrl(userId: string, id: string): Promise<DocumentWithUrl> {
        const document = await this.findOwnById(userId, id);
        return {...document, url: await this.storage.getUrl(document!.storageKey)};
    }

    async listByUserId(userId: string, query: ListDocumentQuery): Promise<Page<Document>> {
        return this.documentRepository.listByUserId(userId, query);
    }

    async listChunks(userId: string, id: string): Promise<DocumentChunk[]> {
        const document = await this.findOwnById(userId, id);
        const chunks = await this.chunkStore.listChunks(document.id, 1000);
        return chunks as unknown as DocumentChunk[];
    }

    async remove(userId: string, id: string): Promise<Document> {
        const existing = await this.findOwnById(userId, id);
        const document = await this.documentRepository.softDelete(existing.id, userId);
        await this.chunkStore.deleteForDocument(existing.id)
            .catch(error => {
                this.logger.warn("Failed to clear chunks on delete", {documentId: existing.id, error});
            })
        await this.publishSafely(DOCUMENT_EVENTS.DOCUMENT_DELETED, {documentId: existing.id, userId});
        return document;
    }

    async upload(userId: string, file: UploadedFile, data?: UploadDocumentData): Promise<Document> {
        const mimeType = resolveDocumentMimeType(file.mimeType, file.originalName);
        if (!mimeType) {
            throw new BadRequestException(`Unsupported file type: ${file.mimeType}`);
        }
        if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestException(`Uploaded file is empty`);
        }

        const storageKey = `documents/${userId}/${randomUUID()}${MIME_TYPE_EXTENSIONS[mimeType]}`;

        await this.storage.upload({key: storageKey, body: file.buffer, contentType: mimeType});

        let document: Document;

        try {
            document = await this.documentRepository.createDocument({
                userId,
                name: data?.name?.trim() || file.originalName.trim(),
                description: data?.description?.trim() || undefined,
                storageKey,
                mimeType,
                sizeBytes: file.buffer.length
            })
        } catch (error) {
            await this.storage.delete(storageKey).catch((err) => {
                this.logger.error("Failed to delete orphaned storage object", {storageKey, error: err});
                throw error;
            })
            throw error;
        }

        try {
            await this.jobQueue.addJob(QUEUES.DOCUMENTS.jobs.PROCESS_DOCUMENT, {
                documentId: document.id,
                correlationId: currentLogContext()?.correlationId
            })
        } catch (error) {
            await this.documentRepository.updateProcessing(document.id, {
                status: "FAILED",
                processedAt: null,
                processingError: "Document could not be queued for processing"
            });
            throw new InternalServerError("Document was created but could not be queued fro processing");
        }

        await this.publishSafely(DOCUMENT_EVENTS.DOCUMENT_UPLOADED, {documentId: document.id, userId})
        return document;
    }

    async search(userId: string, id: string, query: string, limit?: number): Promise<DocumentSearchResult> {
        const document = await this.findOwnById(userId, id);
        if(document.status != "READY") {
            throw new ConflictException("Document is not ready for search");
        }

        const trimmed = query.trim();
        if (trimmed.length === 0) {
            throw new BadRequestException("Query is required");
        }

        const maxChunks = Math.min(Math.max(limit ?? this.config.maxRetrievalChunks, 1), 20);

        if (this.config.embeddingDriver == "none") {
            return {documentId: document.id, query: trimmed, chunks: []}
        }

        const model = this.embeddingModelFactory.resolve();
        const [queryEmbedding] = await model.embed([trimmed]);
        const chunks = await this.chunkStore.searchChunks(document.id, queryEmbedding, maxChunks, this.config.minScore);

        await this.logSearchUsage(userId, document.id, trimmed, chunks, model.modelId);

        return {documentId: document.id, query: trimmed, chunks};
    }




    private async publishSafely<K extends "documents:uploaded" | "documents:deleted">(
        event: K,
        payload: {documentId: string, userId: string}
    ): Promise<void> {
        try {
            await this.eventBus.publish(event, payload);
        } catch (error) {
            this.logger.warn("Failed to publish event", {event, error});
        }
    }

    async reprocess(userId: string, id: string): Promise<Document> {
        const existing = await this.findOwnById(userId, id);
        if (existing.status === "PROCESSING") {
            throw new ConflictException("Document is already being processed");
        }

        const document = await this.documentRepository.updateProcessing(existing.id, {
            status: "UPLOADED",
            processedAt: null,
            processingError: null
        })

        try {
            await this.jobQueue.addJob(QUEUES.DOCUMENTS.jobs.PROCESS_DOCUMENT, {
                documentId: document.id,
                correlationId: currentLogContext()?.correlationId
            });
        } catch (error) {
            await this.documentRepository.updateProcessing(document.id, {
                status: "FAILED",
                processedAt: null,
                processingError: "Document could not be queued for reprocessing"
            })
            throw new InternalServerError("Document could not be queued for reprocessing");
        }

        this.logger.info("Document queued for reprocessing", {documentId: existing.id});
        return document;
    }


    private async logSearchUsage(
        userId: string,
        documentId: string,
        query: string,
        chunks: SearchChunkResult[],
        embeddingModel: string): Promise<void> {

        try {
            await this.usageLogRepository.createUsageLog({
                userId,
                action: "DOCUMENT_SEARCH",
                metadata: {
                    documentId,
                    embeddingModel,
                    query: query.slice(0, 200),
                    chunksUsed: chunks.length,
                }
            })
        } catch (error) {
            this.logger.warn("Failed to log DOCUMENT_SEARCH usage", {documentId, error});
        }
    }
}