export const DOCUMENT_EVENTS = {
    DOCUMENT_UPLOADED: "documents:uploaded",
    DOCUMENT_PROCESSED: "documents:processed",
    DOCUMENT_DELETED: "documents:deleted"
} as const;

export type DocumentsEventMap = {
    [DOCUMENT_EVENTS.DOCUMENT_UPLOADED]: {documentId: string, userId: string};
    [DOCUMENT_EVENTS.DOCUMENT_PROCESSED]: {documentId: string, userId:string, chunkCount: number, status: 'SUCCESS' | 'FAILED'};
    [DOCUMENT_EVENTS.DOCUMENT_DELETED]: {documentId: string, userId: string}
}