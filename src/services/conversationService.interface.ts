import {Conversation} from "@prisma/client";
import {ListConversationQuery} from "../repositories/conversationRepository.interface";
import {Page} from "../types/pagination.type";
import {ConversationAttachment, Message} from "../types/conversation.types";


export interface IConversationService {
    create(userId: string, title?: string): Promise<Conversation>;
    list(userId: string, query: ListConversationQuery): Promise<Page<Conversation>>;
    get(userId: string, id: string): Promise<{conversation: Conversation, documents: ConversationAttachment[] }>;
    rename(userId: string, id: string, title: string): Promise<Conversation>;
    remove(userId: string, id: string): Promise<void>;
    listMessages(userId: string, id: string, limit: number): Promise<Message[]>;
    attachDocuments(userId: string, id: string, documentIds: string[]): Promise<ConversationAttachment[]>;
    detachDocuments(userId: string, id: string, documentId: string): Promise<void>;

}