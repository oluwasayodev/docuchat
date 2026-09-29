import {Page, PaginatedQuery} from "../types/pagination.type";
import {Document, DocumentChunk, DocumentStatus} from "../types/document.types";
import {IBaseRepository} from "./baseRepository.interface";


export type DocumentSortField = "createdAt" | "name" | "chunkCount"

export interface CreateDocumentData {
    userId: string,
    name: string,
    description?: string,
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
}

export type ListDocumentQuery = PaginatedQuery<DocumentSortField> & {
    status?: DocumentStatus;
    search?: string;
}

export interface CreateChunkData {
    index: number;
    content: string;
    tokenCount: number;
    metadata?: Record<string, unknown>;
}

export interface UpdateProcessingData {
    status: DocumentStatus;
    pageCount?: number | null;
    chunkCount?: number;
    processedAt: Date | null;
    processingError?: string | null;
}


export interface IDocumentRepository extends IBaseRepository<Document, string> {

    createDocument(data: CreateDocumentData): Promise<Document>;
    listByUserId(userId: string, query: ListDocumentQuery): Promise<Page<Document>>;
    findOwnById(userId:string, id: string): Promise<Document | null>;
    updateProcessing(id: string, data: UpdateProcessingData): Promise<Document>;
    softDelete(id: string, deletedBy: string): Promise<Document>;
    replaceDocumentChunksAndMarkReady(
        documentId: string,
        chunks: CreateChunkData[],
        pageCount?: number | null,
    ): Promise<Document>;

    listDocumentChunks(documentId: string): Promise<DocumentChunk[]>;
    deleteDocumentChunks(documentId: string): Promise<void>;
}