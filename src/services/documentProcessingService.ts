import {inject, injectable} from "tsyringe";
import {
    DocumentProcessingResult,
    IDocumentProcessingService, LogCallback,
    ProgressCallback
} from "./documentProcessingService.interface";
import {IDocumentRepository} from "../repositories/documentRepository.interface";
import {IStorageService} from "../storage/storageService.interface";
import {IDocumentParsers} from "./parsers/documentParser.interface";
import {IEventBus} from "../events/eventBus.interface";
import {ILogger} from "../logging/logger.interface";
import {isSupportedDocumentMimeType} from "../constants/document.constants";
import {IDocumentChunker} from "./documentChunker.interface";
import {DOCUMENT_EVENTS} from "../events/types/document.events";
import {ChunkInput, IChunkStore} from "../stores/chunkStore.interface";
import {IEmbeddingModelFactory} from "../models/embedding/embeddingModel.factory";
import {IUsageLogRepository} from "../repositories/usageLogRepository.interface";
import {AppConfig} from "../lib/config";
import {IEmbeddingModel} from "../models/embedding/embeddingModel.interface";


@injectable()
export class DocumentProcessingService implements IDocumentProcessingService {

    constructor(
        @inject("IDocumentRepository") private readonly documentRepository: IDocumentRepository,
        @inject("IStorageService") private readonly storage: IStorageService,
        @inject("IDocumentParsers") private readonly parsers: IDocumentParsers,
        @inject("IEventBus") private readonly eventBus: IEventBus,
        @inject("ILogger") private readonly logger: ILogger,
        @inject("IDocumentChunker") private readonly chunker: IDocumentChunker,
        @inject("IChunkStore") private readonly chunkStore: IChunkStore,
        @inject("IEmbeddingModelFactory") private readonly embeddingModelFactory: IEmbeddingModelFactory,
        @inject("IUsageLogRepository") private readonly usageLogRepository: IUsageLogRepository,
        @inject(AppConfig) private readonly config: AppConfig,
    ) {
    }

    async process(
        documentId: string,
        onProgress?: ProgressCallback,
        onLog?: LogCallback,
    ): Promise<DocumentProcessingResult> {

        const report = async (percent: number, message: string): Promise<void> => {
            await onProgress?.(percent);
            await onLog?.(message);
        }

        const document = await this.documentRepository.findById(documentId);
        if (!document) {
            this.logger.warn("Document processing skipped: document does not exist", {documentId});
            return {documentId, status: "FAILED", chunkCount: 0, pageCount: null, error: "Document not found"};
        }

        if (document.status == "READY") {
            this.logger.info("Document processing skipped: already ready.", {documentId});
            await report(100, "Already READY - skipping")
            return {documentId, status: "SUCCESS", chunkCount: document.chunkCount, pageCount: document.pageCount};
        }

        try {
            await this.documentRepository.updateProcessing(documentId, {
                status: "PROCESSING",
                processedAt: null,
                processingError: null,
            });
            await report(1, "Document validation complete");

            const buffer = await this.storage.getBuffer(document.storageKey);

            if (!isSupportedDocumentMimeType(document.mimeType)) {
                throw new Error(`Unsupported storage mime type: ${document.mimeType}`);
            }
            const parsed = await this.parsers.resolve(document.mimeType).parse({
                buffer,
                mimeType: document.mimeType,
                originalName: document.name
            });
            await report(3, `Parsed ${parsed.pageCount} pages`)

            const chunks = await this.chunker.chunk(parsed);
            await report(3, `Chunked into ${chunks.length} chunks`)

            if (chunks.length === 0) {
                throw new Error("Document contains no extractable text");
            }

            const input: ChunkInput[] = chunks.map(chunk => ({
                index: chunk.index,
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                metadata: chunk.metadata
            }))

            let embeddingModel: IEmbeddingModel | null = null;
            if (this.config.embeddingDriver !== "none") {
                embeddingModel = this.embeddingModelFactory.resolve();
                const embeddings = await embeddingModel.embed(
                    input.map(chunk => chunk.content),
                    async (done, total) => {
                        const percent = 3 + Math.round((85 * done) / total);
                        await report(percent, `Embedded ${done}/${total} chunks`);
                    }
                );

                input.forEach((chunk, index) => {
                    chunk.embedding = embeddings[index];
                })
            }

            await this.chunkStore.replaceChunks(documentId, input);
            await report(90, `Stored ${input.length} chunks`)
            await this.documentRepository.updateProcessing(documentId, {
                status: "READY",
                pageCount: parsed.pageCount,
                chunkCount: input.length,
                processedAt: new Date(),
                processingError: null,
            });
            await report(99, "Document Marked READY");
            await this.logEmbeddingUsage(document.userId, documentId, input, embeddingModel)
            // await this.documentRepository.replaceDocumentChunksAndMarkReady(documentId, chunks, parsed.pageCount);
            await this.publishProcessed(document.userId, documentId, chunks.length, "SUCCESS");

            this.logger.info("Document processed successfully", {
                documentId,
                chunkCount: chunks.length,
                pageCount: parsed.pageCount,
            });
            await report(100, "Processing complete")
            return {documentId, status: "SUCCESS", chunkCount: chunks.length, pageCount: parsed.pageCount};
        } catch (error) {

            const message = this.toErrorMessage(error);
            const hasUsableChunks = await this.hasStoredChunks(documentId);


            await this.documentRepository.updateProcessing(documentId, {
                status: hasUsableChunks ? "READY" : "FAILED",
                processedAt: hasUsableChunks ? document.processedAt : null,
                processingError: message,
            });

            await onLog?.(`Document processing failed: ${message}`);


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

    private async logEmbeddingUsage(
        userId: string,
        documentId: string,
        chunks: ChunkInput[],
        embeddingModel: IEmbeddingModel | null
    ): Promise<void> {
        if (!embeddingModel) return ;

        try {
            await this.usageLogRepository.createUsageLog({
                userId,
                action: "EMBEDDING",
                tokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
                metadata: {
                    documentId,
                    embeddingModel: embeddingModel.modelId,
                    chunkCount: chunks.length,
                }
            })
        } catch (error) {
            this.logger.error("Failed to log EMBEDDING usage", error, {documentId})
        }
    }

    private async hasStoredChunks(documentId: string): Promise<boolean> {
        try {
            const existing = await this.chunkStore.listChunks(documentId, 1);
            return existing.length > 0;
        } catch (error) {
            return false
        }

    }
}