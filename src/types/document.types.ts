export const DOCUMENT_STATUSES = [
    "UPLOADED",
    "PROCESSING",
    "READY",
    "FAILED",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface Document {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    status: DocumentStatus;
    processingError: string | null;
    pageCount: number | null;
    chunkCount: number;
    processedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedBy: string | null;
}

export interface DocumentChunk {
    id: string;
    documentId: string;
    index: number;
    content: string;
    tokenCount: number;
    createdAt: Date;
    metadata?: Record<string, unknown> | null;
}