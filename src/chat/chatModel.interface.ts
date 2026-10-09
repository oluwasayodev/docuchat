import {ChatRequest, ChatStreamChunk} from "../types/chat.types";


export interface IChatModel {
    readonly provider: "ollama" | "openai";
    generateStream(request: ChatRequest): AsyncIterable<ChatStreamChunk>;
}