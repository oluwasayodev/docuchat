import {ChatMessage} from "../types/chat.types";
import {ChunkCost, deriveRetrievalBudget, ModelDescriptor, RetrievalBudget} from "./modelDescriptor";
import {countMessageTokens, estimateTokens} from "../services/tokenEstimator";
import {CHAT_SYSTEM_PROMPT} from "../prompts/chat.prompt";
import {SearchChunkResult} from "../stores/chunkStore.interface";


export const HISTORY_SHARE = 0.25;
export const CHAT_SYSTEM_PROMPT_TOKENS: number = estimateTokens(CHAT_SYSTEM_PROMPT);

export interface RetrievalPlan {
    history: ChatMessage[];
    historyTokens: number;
    budget: RetrievalBudget;
    limit: number;
}

export function planRetrieval(
    descriptor: ModelDescriptor,
    question: string,
    history: ChatMessage[],
    chunk: ChunkCost,
    configMaxChunks: number,
): RetrievalPlan {
    const systemPromptTokens = CHAT_SYSTEM_PROMPT_TOKENS
    const userQuestionTokens = estimateTokens(question);
    const available = Math.max(
        0,
        descriptor.contextTokens
        - descriptor.maxOutputTokens
        - systemPromptTokens
        - userQuestionTokens
    )

    const historyAllowance = Math.floor(available * HISTORY_SHARE);

    const selected: ChatMessage[] = [];

    let historyTokens = 0;

    for (let i = history.length - 1; i >= 0; i--) {
        const cost = countMessageTokens(history[i]);
        if (historyTokens + cost > historyAllowance) break;
        selected.unshift(history[i]);
        historyTokens += cost;
    }

    const budget = deriveRetrievalBudget(
        descriptor,
        {systemPromptTokens, userQuestionTokens, historyTokens},
        chunk
    )

    return {
        history: selected,
        historyTokens,
        budget,
        limit: Math.max(0, Math.min(configMaxChunks, budget.maxRetrievalChunks))
    }
}


export function dedupeAdjacentChunks(chunks: SearchChunkResult[]): SearchChunkResult[] {
    const kept: SearchChunkResult[] = [];
    for (const chunk of chunks) {
        const redundant = kept.some(k =>
            k.documentId === chunk.documentId && Math.abs(k.index - chunk.index) <= 1
        );
        if (!redundant) kept.push(chunk);
    }

    return kept;
}