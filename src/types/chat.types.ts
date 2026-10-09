import {ModelDescriptor} from "../chat/modelDescriptor";


export const CHAT_ROLES = ["SYSTEM", "USER", "ASSISTANT"] as const;
export type ChatRole = (typeof CHAT_ROLES)[number];


export interface ChatMessage {
    role: ChatRole;
    content: string;
}

export const FINISH_REASONS = ["STOP", "LENGTH", "ERROR"] as const;
export type FinishReason = (typeof FINISH_REASONS)[number];

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}


export interface ChatRequest {
    model: ModelDescriptor;
    messages: ChatMessage[];
    maxOutputTokens: number;
    temperature?: number;
    signal?: AbortSignal;
}


export type ChatStreamChunk =
    | {type: "reasoning"; text: string }
    | {type: "content"; text: string }
    | {type: "usage"; usage: TokenUsage }
    | {type: "finish"; reason: FinishReason }