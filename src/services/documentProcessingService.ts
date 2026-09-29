import {inject, injectable} from "tsyringe";
import {DocumentProcessingResult, IDocumentProcessingService} from "./documentProcessingService.interface";
import {IDocumentRepository} from "../repositories/documentRepository.interface";
import {IStorageService} from "../storage/storageService.interface";
import {IDocumentParsers} from "./parsers/documentParser.interface";
import {IEventBus} from "../events/eventBus.interface";
import {ILogger} from "../logging/logger.interface";
import {isSupportedDocumentMimeType} from "../constants/document.constants";
import {IDocumentChunker} from "./documentChunker.interface";
import {DOCUMENT_EVENTS} from "../events/types/document.events";


@injectable()
export class DocumentProcessingService implements IDocumentProcessingService {

    constructor(
        @inject("IDocumentRepository") private readonly documentRepository: IDocumentRepository,
        @inject("IStorageService") private readonly storage: IStorageService,
        @inject("IDocumentParsers") private readonly parsers: IDocumentParsers,
        @inject("IEventBus") private readonly eventBus: IEventBus,
        @inject("ILogger") private readonly logger: ILogger,
        @inject("IDocumentChunker") private readonly chunker: IDocumentChunker,
    ) {
    }

    async process(documentId: string): Promise<DocumentProcessingResult> {

        const document = await this.documentRepository.findById(documentId);
        if (!document) {
            this.logger.warn("Document processing skipped: document does not exist", {documentId});
            return {documentId, status: "FAILED", chunkCount: 0, pageCount: null, error: "Document not found"};
        }

        if (document.status == "READY") {
            this.logger.info("Document processing skipped: already ready.", {documentId});
            return {documentId, status: "SUCCESS", chunkCount: document.chunkCount, pageCount: document.chunkCount};
        }

        try {
            await this.documentRepository.updateProcessing(documentId, {
                status: "PROCESSING",
                processedAt: null,
                processingError: null,
            });

            const buffer = await this.storage.getBuffer(document.storageKey);

            if (!isSupportedDocumentMimeType(document.mimeType)) {
                throw new Error(`Unsupported storage mime type: ${document.mimeType}`);
            }

            const parsed = await this.parsers.resolve(document.mimeType).parse({
                buffer,
                mimeType: document.mimeType,
                originalName: document.name
            });

            const chunks = await this.chunker.chunk(parsed);

            if (chunks.length === 0) {
                throw new Error("Document contains no extractable text");
            }

            await this.documentRepository.replaceDocumentChunksAndMarkReady(documentId, chunks, parsed.pageCount);
            await this.publishProcessed(document.userId, documentId, chunks.length, "SUCCESS");

            this.logger.info("Document processed successfully", {
                documentId,
                chunkCount: chunks.length,
                pageCount: parsed.pageCount,
            })
            return {documentId, status: "SUCCESS", chunkCount: chunks.length, pageCount: parsed.pageCount};
        } catch (error) {

            const message = this.toErrorMessage(error);

            await this.documentRepository.delete(documentId);
            await this.documentRepository.updateProcessing(documentId, {
                status: "FAILED",
                processedAt: null,
                processingError: message,
            });

            await this.publishProcessed(document.userId, documentId, 0, "FAILED");
            this.logger.error("Document processed failed: ", error, {documentId});
            throw error;
        }


    }

    private async publishProcessed(
        userId: string,
        documentId: string,
        chunkCount: number,
        status: "SUCCESS" | "FAILED"
    ):Promise<void> {
        try {
            await this.eventBus.publish(DOCUMENT_EVENTS.DOCUMENT_PROCESSED, {
                documentId,
                userId,
                chunkCount,
                status
            })
        } catch (error) {
            this.logger.error("Failed to publish document processed event", error, {documentId, status})
        }
    }

    private toErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : "Unknown error";
    }
}