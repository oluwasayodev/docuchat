import {DocumentStatus} from "./document.types";


export const MESSAGE_ROLES = [
    "USER",
    "ASSISTANT",
    "SYSTEM"
] as const;


export type MessageRole = (typeof MESSAGE_ROLES)[number];

export interface Conversation {
    id: string;
    userId: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedBy: string | null;
}

export interface Message {

    id: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    modelId: string | null;
    tokenCount: number;
    costUsd: number | null;
    createdAt: Date;
}

export interface ConversationAttachment {
    documentId: string;
    name: string;
    status: DocumentStatus;
}