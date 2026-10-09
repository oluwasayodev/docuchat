import {SearchChunkResult} from "../stores/chunkStore.interface";
import {ChatMessage} from "../types/chat.types";


export const CHAT_SYSTEM_PROMPT = [
    "You are DocuChat, an assistant that answers questions about user's uploaded documents.",
    "Ground every answer in the provided context excerpts.",
    "If the context does not contain the answer, say so plainly instead of guessing.",
    "When you use an excerpt, reference it by its number in square brackets, for example [1].",
    "Keep answers concise and factual"
].join(" ");


export function renderContext(chunks: SearchChunkResult[]): string {

    if (chunks.length === 0) return '';
    const blocks = chunks.map((chunk, i) => {
        const location = typeof chunk.page === "number"
        ? "page " + chunk.page : "chunk " + (chunk.index + 1);

        return `[${i+1}] ${location}\n${chunk.content}`;
    })

    return `Content excerpts:\n\n${blocks.join("\n\n")}`;
}


export function buildChatMessages(
    history: ChatMessage[],
    chunks: SearchChunkResult[],
    question: string
) : ChatMessage[] {

    const messages: ChatMessage[] = [{role: "SYSTEM", content: CHAT_SYSTEM_PROMPT}];

    messages.push(...history);
    const context = renderContext(chunks);
    if (context) {
        messages.push({role: "SYSTEM", content: context});
    }

    messages.push({role: "USER", content: question});
    return messages;
}