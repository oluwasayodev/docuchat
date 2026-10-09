

export type ProgressCallback = (progress: number) => Promise<void> | void;
export type LogCallback = (message: string) => Promise<void> | void;


export interface DocumentProcessingResult {

    documentId: string;
    status: "SUCCESS" | "FAILED";
    chunkCount: number;
    pageCount: number | null;
    error?: string;
}

export interface IDocumentProcessingService {

    process(
        documentId: string,
        onProgress?: ProgressCallback,
        onLog?: LogCallback
    ): Promise<DocumentProcessingResult>;

}

