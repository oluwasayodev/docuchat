import {
    ConversationSortField, CreateConversationData, CreateMessageData,
    IConversationRepository,
    ListConversationQuery
} from "./conversationRepository.interface";
import {inject, injectable} from "tsyringe";
import {
    Prisma,
    PrismaClient,
    Conversation as PrismaConversation,
    Message as PrismaMessage,
} from "@prisma/client";
import {Conversation, ConversationAttachment, Message, MessageRole} from "../types/conversation.types";
import {Page} from "../types/pagination.type";
import {buildPage, resolvePage} from "./pagination.util";
import {resolveSort} from "./sorting.util";


const SORTABLE_FIELDS: readonly ConversationSortField[] = ["createdAt", "title"]

@injectable()
export class PrismaConversationRepository implements IConversationRepository {

    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async addMessage(data: CreateMessageData): Promise<Message> {
        const row = await this.prisma.message.create({
            data: {
                conversationId: data.conversationId,
                role: data.role,
                content: data.content,
                modelId: data.modelId ?? null,
                tokenCount: data.tokenCount ?? 0,
                costUsd: data.costUsd ?? null
            }
        })

        return this.toMessage(row);
    }

    async attachDocuments(conversationId: string, documentIds: string[]): Promise<void> {
        if (documentIds.length === 0) return;
        await this.prisma.conversationDocument.createMany({
            data: documentIds.map(documentId => ({conversationId, documentId})),
            skipDuplicates: true
        })
    }

    async create(data: Partial<Conversation>): Promise<Conversation> {
        return this.createConversation(data as CreateConversationData);
    }

    async createConversation(data: CreateConversationData): Promise<Conversation> {
        const row = await this.prisma.conversation.create({
            data: {
                userId: data.userId,
                title: data.title ?? null
            }
        })

        return this.toConversation(row);
    }

    async delete(id: string): Promise<boolean> {
        const {count} = await this.prisma.conversation.deleteMany({where: {id}});
        return count > 0;
    }

    async detachDocument(conversationId: string, documentId: string): Promise<void> {
        await this.prisma.conversationDocument.deleteMany({
            where: {conversationId, documentId}
        })
    }

    async findAll(): Promise<Conversation[]> {
        const rows = await this.prisma.conversation.findMany();
        return rows.map(row => this.toConversation(row));
    }

    async findById(id: string): Promise<Conversation | null> {
        const row = await this.prisma.conversation.findUnique({where: {id}});
        return row ? this.toConversation(row) : null
    }

    async findOwnByUserId(userId: string, id: string): Promise<Conversation | null> {
        const row = await this.prisma.conversation.findFirst({
            where: {id, userId, deletedAt: null}
        });

        return row ? this.toConversation(row) : null;
    }

    async listAttachedDocuments(conversationId: string): Promise<ConversationAttachment[]> {
        const rows = await this.prisma.conversationDocument.findMany({
            where: {conversationId},
            include: {document: {select: {name: true, status: true}}},
        })

        return rows.map(row => ({
            documentId: row.documentId,
            name: row.document.name,
            status: row.document.status,
        }))
    }

    async listByUserId(userId: string, query: ListConversationQuery): Promise<Page<Conversation>> {
        const resolved = resolvePage(query);
        const {orderBy, sort} = resolveSort(SORTABLE_FIELDS, "createdAt", "desc", query);

        const where: Prisma.ConversationWhereInput = {
            userId: userId,
            deletedAt: null,
        }

        const [rows, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                orderBy,
                skip: resolved.skip,
                take: resolved.take
            }),
            this.prisma.conversation.count({where}),
        ]);

        return buildPage(rows.map(row => this.toConversation(row)), total, resolved, sort);
    }

    async listMessages(conversationId: string, limit: number): Promise<Message[]> {
        const rows = await this.prisma.message.findMany({
            where: {conversationId},
            orderBy: {createdAt: "desc"},
            take: limit
        });
        return rows.reverse().map(row => this.toMessage(row));
    }

    async softDelete(id: string, deletedBy: string): Promise<Conversation> {

        const row =  await this.prisma.conversation.update({
            where: {id},
            data: {deletedAt: new Date(), deletedBy}
        })

        return this.toConversation(row);
    }

    async update(id: string, data: Partial<Conversation>): Promise<Conversation> {
        return this.updateTitle(id, (data as {title:string}).title);
    }

    async updateTitle(id: string, title: string): Promise<Conversation> {
        const row = await this.prisma.conversation.update({
            where: {id},
            data: {title}
        });

        return this.toConversation(row)


    }


    private toConversation(row: PrismaConversation): Conversation {
        return {
            id: row.id,
            userId: row.userId,
            title: row.title,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            deletedAt: row.deletedAt,
            deletedBy: row.deletedBy
        }
    }

    private toMessage(row: PrismaMessage): Message {
        return {
            id: row.id,
            conversationId: row.conversationId,
            role: row.role as MessageRole,
            content: row.content,
            modelId: row.modelId,
            tokenCount: row.tokenCount,
            costUsd: row.costUsd === null ? null : row.costUsd.toNumber(),
            createdAt: row.createdAt
        }
    }

}