import {inject, injectable} from "tsyringe";
import {IConversationService} from "./conversationService.interface";
import {IConversationRepository, ListConversationQuery} from "../repositories/conversationRepository.interface";
import {IDocumentRepository} from "../repositories/documentRepository.interface";
import {Conversation, ConversationAttachment, Message} from "../types/conversation.types";
import {Page} from "../types/pagination.type";
import {BadRequestException, NotFoundError} from "../errors/http.error";


@injectable()
export class ConversationService implements IConversationService {


    constructor(
        @inject('IConversationRepository') private conversations: IConversationRepository,
        @inject("IDocumentRepository") private documents: IDocumentRepository
    ) {}

    async attachDocuments(userId: string, id: string, documentIds: string[]): Promise<ConversationAttachment[]> {
        await this.findOwn(userId, id);

        const ids = [...new Set(documentIds)]
        const invalid: string[] = [];

        for (const documentId of ids) {
            const document = await this.documents.findOwnById(userId, documentId);
            if(!document) invalid.push(documentId);
        }

        if (invalid.length > 0) {
            throw new BadRequestException(`Document not found for or owned by this user: ${invalid.join(", ")}`)
        }

        await this.conversations.attachDocuments(id, ids);
        return this.conversations.listAttachedDocuments(id);

    }

    async create(userId: string, title?: string): Promise<Conversation> {
        if (title == null) {
            return this.conversations.createConversation({userId});
        }

        const trimmed = title?.trim();
        if (!trimmed) throw new BadRequestException("Title must not be blank");

        return this.conversations.createConversation({userId, title: trimmed});
    }

    async detachDocuments(userId: string, id: string, documentId: string): Promise<void> {
        await this.findOwn(userId, id);
        await this.conversations.detachDocument(id, documentId);
    }

    async get(userId: string, id: string): Promise<{ conversation: Conversation; documents: ConversationAttachment[] }> {
        const conversation = await this.findOwn(userId, id);
        const documents = await this.conversations.listAttachedDocuments(id);
        return {conversation, documents}
    }

    async list(userId: string, query: ListConversationQuery): Promise<Page<Conversation>> {
        return this.conversations.listByUserId(userId, query);
    }

    async listMessages(userId: string, id: string, limit: number): Promise<Message[]> {
        await this.findOwn(userId, id);
        const take = Math.min(Math.max(Math.trunc(limit), 1), 200);
        return this.conversations.listMessages(id, take);
    }

    async remove(userId: string, id: string): Promise<void> {
        await this.findOwn(userId, id);
        await this.conversations.softDelete(id, userId);
    }

    async rename(userId: string, id: string, title: string): Promise<Conversation> {
        const trimmed = title.trim();
        if (!trimmed) throw new BadRequestException("Title must not be blank");
        await this.findOwn(userId, id);

        return this.conversations.updateTitle(id, trimmed);
    }


    private async findOwn(userId: string, id: string): Promise<Conversation> {
        const conversation = await this.conversations.findOwnByUserId(userId, id);
        if (!conversation) throw new NotFoundError("Conversation not found");
        return conversation;
    }
}