export const DOCUMENT_EVENTS = {
    DOCUMENT_UPLOADED: "documents:uploaded",
    DOCUMENT_PROCESSED: "documents:processed"
} as const;

export type DocumentsEventMap = {
    [DOCUMENT_EVENTS.DOCUMENT_UPLOADED]: {documentId: string, userId: string, fileUrl: string};
    [DOCUMENT_EVENTS.DOCUMENT_PROCESSED]: {documentId: string, chunkCount: number, status: 'SUCCESS' | 'FAILED'};
}