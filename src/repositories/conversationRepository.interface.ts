import {Page, PaginatedQuery} from "../types/pagination.type";
import {IBaseRepository} from "./baseRepository.interface";
import {Conversation, ConversationAttachment, Message, MessageRole} from "../types/conversation.types";


export type ConversationSortField = "createdAt" | "title";


export interface CreateConversationData {
    userId: string;
    title?: string | null;
}

export type ListConversationQuery = PaginatedQuery<ConversationSortField>;

export interface CreateMessageData {
    conversationId: string;
    role: MessageRole;
    content: string;
    modelId?: string | null;
    tokenCount?: number;
    costUsd?: number | null;
}

export interface IConversationRepository extends IBaseRepository<Conversation, string>{

    createConversation(data: CreateConversationData): Promise<Conversation>;
    listByUserId(userId: string, query: ListConversationQuery): Promise<Page<Conversation>>;
    findOwnByUserId(userId: string, id: string): Promise<Conversation | null>;
    updateTitle(id: string, title: string): Promise<Conversation>;
    softDelete(id: string, deletedBy: string): Promise<Conversation>;

    attachDocuments(conversationId: string, documentIds: string[]): Promise<void>;
    detachDocument(conversationId: string, documentId: string): Promise<void>;
    listAttachedDocuments(conversationId: string): Promise<ConversationAttachment[]>;

    addMessage(data: CreateMessageData): Promise<Message>;
    listMessages(conversationId: string, limit: number): Promise<Message[]>;
}