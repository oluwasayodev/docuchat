import {Document, DocumentChunk} from "../types/document.types";
import {ListDocumentQuery} from "../repositories/documentRepository.interface";
import {Page} from "../types/pagination.type";
import {SearchChunkResult} from "../stores/chunkStore.interface";

export interface UploadedFile {
    originalName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
}

export interface UploadDocumentData {
    name?: string;
    description?: string;
}

export type DocumentWithUrl = Document & {url: string};

export interface DocumentDownload {
    document: Document;
    buffer: Buffer;
    mimeType: string;
}

export interface DocumentSearchResult {
    documentId: string;
    query: string;
    chunks: SearchChunkResult[];
}


export interface IDocumentService {
    upload(userId: string, file: UploadedFile, data?: UploadDocumentData): Promise<Document>;
    listByUserId(userId: string, query: ListDocumentQuery): Promise<Page<Document>>;
    findOwnById(userId: string, id: string): Promise<Document>;
    getWithUrl(userId: string, id: string): Promise<DocumentWithUrl>;
    getDownload(userId: string, id: string): Promise<DocumentDownload>;
    listChunks(userId: string, id:string): Promise<DocumentChunk[]>;
    remove(userId: string, id: string): Promise<Document>;
    reprocess(userId: string, id: string): Promise<Document>;
    search(userId: string, id: string, query: string, limit?: number): Promise<DocumentSearchResult>;
}
