import {getEncoding, Tiktoken} from "js-tiktoken";
import {config} from "../lib/config";
import {ChatMessage} from "../types/chat.types";


const encoder: Tiktoken = getEncoding(config.documentTokenEncoding);

const PER_MESSAGE_OVERHEAD = 4;

export function estimateTokens(text: string): number {
    return encoder.encode(text).length;
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
    let total = 0;
    for (const message of messages) {
        total += countMessageTokens(message);
    }
    return total;
}

export function countMessageTokens(message: ChatMessage): number {
    return estimateTokens(message.content) + PER_MESSAGE_OVERHEAD;
}