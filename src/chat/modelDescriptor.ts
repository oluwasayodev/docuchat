


export interface ModelDescriptor {
    id: string;
    displayName: string;
    provider: "ollama" | "openai";
    contextTokens: number;
    maxOutputTokens: number;
    supportsReasoning: boolean;
    estimatedTokensPerSecond: number;
}


export interface RetrievalBudget {
    maxRetrievalChunks: number;
    availableForRetrieval: number;
}

export interface RetrievalBudgetInput {
    systemPromptTokens: number;
    userQuestionTokens: number;
    historyTokens: number;
}

export interface ChunkCost {
    sizeTokens: number;
    overheadTokens: number;
}

export function deriveRetrievalBudget(
    descriptor: ModelDescriptor,
    reserved: RetrievalBudgetInput,
    chunk: ChunkCost,
): RetrievalBudget {

    const effectiveChunkCost = Math.max(1, chunk.sizeTokens + chunk.overheadTokens);

    const available = Math.max(
        0,
        descriptor.contextTokens
        - descriptor.maxOutputTokens
        - reserved.systemPromptTokens
        - reserved.userQuestionTokens
        - reserved.historyTokens
    );

    return {
        availableForRetrieval: available,
        maxRetrievalChunks: available > 0 ? Math.floor(available / effectiveChunkCost) : 0,
    }
}