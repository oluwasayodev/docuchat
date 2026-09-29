import {inject, injectable} from "tsyringe";
import {
    DocumentDownload,
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
import {error, query} from "winston";


@injectable()
export class DocumentService implements IDocumentService {

    constructor(
        @inject("IDocumentRepository") private readonly documentRepository: IDocumentRepository,
        @inject("IStorageService") private readonly storage: IStorageService,
        @inject("IJobQueue") private readonly jobQueue: IJobQueue,
        @inject("IEventBus") private readonly eventBus: IEventBus,
        @inject("ILogger") private readonly logger: ILogger,
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
        await this.findOwnById(userId, id);
        return this.documentRepository.listDocumentChunks(id);
    }

    async remove(userId: string, id: string): Promise<Document> {
        const existing = await this.findOwnById(userId, id);
        const document = this.documentRepository.softDelete(existing.id, userId);
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
            await this.jobQueue.addJob(QUEUES.DOCUMENTS.jobs.PROCESS_DOCUMENT, {documentId: document.id})
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
            await this.jobQueue.addJob(QUEUES.DOCUMENTS.jobs.PROCESS_DOCUMENT, {documentId: document.id});
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





}