import {ModelDescriptor} from "../chat/modelDescriptor";
import {RetrievalPlan} from "../chat/retrievalPlan";
import {SearchChunkResult} from "../stores/chunkStore.interface";
import {ChatMessage, FinishReason, TokenUsage} from "../types/chat.types";


export interface ChatContext {
    plan: RetrievalPlan,
    chunks: SearchChunkResult[],
    messages: ChatMessage[],
}

export type ChatEvent =
    | { type: "citations"; chunks: SearchChunkResult[] }
    | { type: "reasoning"; text: string }
    | { type: "content"; text: string }
    | { type: "done"; messageId: string; finishReason: FinishReason; usage: TokenUsage | null };

export interface ChatInput {
    userId: string;
    conversationId: string;
    question: string;
    modelId?: string;
    signal?: AbortSignal;
}

export interface IChatService {
    listModels(): ModelDescriptor[];
    resolveModel(modelId?: string): ModelDescriptor;
    prepareContext(
        userId: string,
        conversationId: string,
        question: string,
        descriptor: ModelDescriptor,
    ): Promise<ChatContext>;
    chat(input: ChatInput): AsyncIterable<ChatEvent>;
}
