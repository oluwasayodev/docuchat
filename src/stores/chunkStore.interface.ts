

export interface ChunkInput {
    index: number;
    content: string;
    tokenCount: number;
    metadata?: Record<string, unknown>;
    embedding?: number[];
}

export interface SearchChunkResult {
    id: string;
    documentId: string;
    index: number;
    content: string;
    page?: number | null;
    tokenCount: number;
    metadata?: Record<string, unknown> | null;
    score: number;
}

export interface VectorChunkRow {
    id: string;
    documentId: string;
    index: number;
    content: string;
    page: string | null;
    tokenCount: number;
    metadata: unknown;
    score: number;
    createdAt: Date;
}


export interface StoredChunk {
    id: string;
    index: number;
    content: string;
    page: number | null;
    tokenCount: number;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}

export interface IChunkStore {
    replaceChunks(documentId: string, chunks: ChunkInput[]): Promise<void>;
    searchChunks(documentId: string, queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]>;
    searchChunksMany(documentIds: string[], queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]>;
    listChunks(documentId: string, limit: number): Promise<StoredChunk[]>;
    deleteForDocument(documentId: string): Promise<void>;
}