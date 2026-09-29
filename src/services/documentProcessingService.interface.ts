
export interface DocumentProcessingResult {

    documentId: string;
    status: "SUCCESS" | "FAILED";
    chunkCount: number;
    pageCount: number | null;
    error?: string;
}

export interface IDocumentProcessingService {

    process(documentId: string): Promise<DocumentProcessingResult>;
}

