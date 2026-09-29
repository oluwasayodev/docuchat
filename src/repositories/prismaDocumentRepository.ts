import {
    CreateChunkData,
    CreateDocumentData,
    DocumentSortField,
    IDocumentRepository,
    ListDocumentQuery, UpdateProcessingData
} from "./documentRepository.interface";
import {inject, injectable} from "tsyringe";
import {Page} from "../types/pagination.type";
import {Prisma, PrismaClient} from "@prisma/client";
import {Document, DocumentChunk} from "../types/document.types";
import {buildPage, resolvePage} from "./pagination.util";
import {resolveSort} from "./sorting.util";


const SORTABLE_FIELDS: readonly DocumentSortField[] = ["createdAt", "name", "chunkCount"]


@injectable()
export class PrismaDocumentRepository implements IDocumentRepository {


    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async create(data: Partial<Document>): Promise<Document> {
        return this.createDocument(data as CreateDocumentData);
    }

    async createDocument(data: CreateDocumentData): Promise<Document> {
        return this.prisma.chatDocument.create({data})
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.chatDocument.delete({where: {id}});
        return true;
    }

    async findAll(): Promise<Document[]> {
        return this.prisma.chatDocument.findMany({where: {deletedAt: null}});
    }

    async findById(id: string): Promise<Document | null> {
        return this.prisma.chatDocument.findFirst({where: {id, deletedAt: null}});
    }

    async findOwnById(userId: string, id: string): Promise<Document | null> {
        return this.prisma.chatDocument.findFirst({where: {id, userId, deletedAt: null}});
    }

    async listByUserId(userId: string, query: ListDocumentQuery): Promise<Page<Document>> {
        const resolved = resolvePage(query);
        const {orderBy, sort} = resolveSort(SORTABLE_FIELDS, "createdAt", "desc", query);

        const where: Prisma.ChatDocumentWhereInput = {
            userId: userId,
            deletedAt: null,
            ...(query.status ? {status: query.status} : {}),
            ...(query.search ? {
                OR: [
                    {name: {contains: query.search, mode: "insensitive"}},
                    {description: {contains: query.search, mode: "insensitive"}},
                ]
            } : {})
        }

        const [rows, total] = await Promise.all([
            this.prisma.chatDocument.findMany({
                where,
                orderBy,
                skip: resolved.skip,
                take: resolved.take
            }),
            this.prisma.chatDocument.count({where}),
        ]);

        return buildPage(rows, total, resolved, sort);
    }

    async listDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
        const rows = await this.prisma.documentChunk.findMany({
            where: {documentId},
            orderBy: {index: "asc"}
        })

        return rows.map(row => ({
            ...row,
            metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        }))
    }

    async replaceDocumentChunksAndMarkReady(documentId: string, chunks: CreateChunkData[], pageCount?: number | null): Promise<Document> {
        return this.prisma.$transaction(async (tx) => {
            await tx.documentChunk.deleteMany({where: {documentId}});

            if (chunks.length > 0){
                await tx.documentChunk.createMany({
                    data: chunks.map(chunk => ({
                        documentId,
                        index: chunk.index,
                        content: chunk.content,
                        tokenCount: chunk.tokenCount,
                        metadata: chunk.metadata as Prisma.InputJsonValue | undefined
                    }))
                })
            }

            return tx.chatDocument.update({
                where: {id: documentId},
                data: {
                    status: "READY",
                    chunkCount: chunks.length,
                    pageCount: pageCount ?? null,
                    processedAt: new Date(),
                    processingError: null
                }
            })
        })
    }

    async softDelete(id: string, deletedBy: string): Promise<Document> {
        return this.prisma.chatDocument.update({
            where: {id},
            data: {deletedAt: new Date(), deletedBy},
        });
    }

    async update(id: string, data: Partial<Document>): Promise<Document> {
        return this.updateProcessing(id, data as UpdateProcessingData);
    }

    async updateProcessing(id: string, data: UpdateProcessingData): Promise<Document> {
        return this.prisma.chatDocument.update({
            where: {id},
            data: {
                status: data.status,
                pageCount: data.pageCount,
                chunkCount: data.chunkCount,
                processedAt: data.processedAt,
                processingError: data.processingError,
            }
        })
    }

    async deleteDocumentChunks(documentId: string): Promise<void> {
        await this.prisma.documentChunk.deleteMany({where: {documentId}});
    }



}