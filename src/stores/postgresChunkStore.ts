import {inject, injectable} from "tsyringe";
import {ChunkInput, IChunkStore, SearchChunkResult, StoredChunk, VectorChunkRow} from "./chunkStore.interface";
import {Prisma, PrismaClient} from "@prisma/client";
import {query} from "winston";
import {Record} from "@prisma/client/runtime/client";
import {prisma} from "../lib/prisma";


@injectable()
export class PostgresChunkStore implements IChunkStore {

    constructor(@inject(PrismaClient) private readonly prisma: PrismaClient) {}


    async deleteForDocument(documentId: string): Promise<void> {
        await this.prisma.documentChunk.deleteMany({where: {documentId}});
    }

    async replaceChunks(documentId: string, chunks: ChunkInput[]): Promise<void> {
        await this.prisma.documentChunk.deleteMany({where: {documentId}});

        for (const chunk of chunks) {
            const embedding = chunk.embedding ? `[${chunk.embedding.join(",")}]` : null;
            await this.prisma.$executeRaw`
            INSERT INTO document_chunks (id, "documentId", "index", content, "tokenCount", metadata, embedding)
            VALUES (
                gen_random_uuid(),
                ${documentId},
                ${chunk.index},
                ${chunk.content},
                ${chunk.tokenCount},
                ${JSON.stringify(chunk.metadata ?? null)}::jsonb,
                ${embedding}::vector
            );`
        }
    }

    async listChunks(documentId: string, limit: number): Promise<StoredChunk[]> {
        const rows = await this.prisma.$queryRaw<VectorChunkRow[]>`
         SELECT
            id,
            "index",
            content,
            "tokenCount",
            metadata,
            "createdAt",
            CASE WHEN metadata->>'page' IS NOT NULL THEN CAST(metadata->>'page' AS integer) END AS page,
            0 AS score
         FROM document_chunks
         WHERE "documentId" = ${documentId}
         ORDER BY "index" ASC
         LIMIT ${limit}
        `;

        return rows.map(row => ({
            id: row.id,
            index: row.index,
            content: row.content,
            page: row.page ? Number(row.page) : null,
            tokenCount: row.tokenCount,
            metadata: row.metadata as Record<string, unknown> | null,
            createdAt: new Date(row.createdAt),
        }))
    }

    async searchChunks(documentId: string, queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]> {
        const query = `[${queryEmbedding.join(",")}]`;

        const rows = await this.prisma.$queryRaw<VectorChunkRow[]>`
         SELECT
            id,
            "index",
            content,
            "tokenCount",
            metadata,
            CASE WHEN metadata->>'page' IS NOT NULL THEN CAST(metadata->>'page' AS integer) END AS page,
            1 - (embedding <=> ${query}::vector) AS score
         FROM document_chunks
         WHERE "documentId" = ${documentId}
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> ${query}::vector) >= ${minScore}
         ORDER BY embedding <=> ${query}::vector
         LIMIT ${limit}
        `;

        return rows.map(row => ({
            id: row.id,
            documentId,
            index: row.index,
            content: row.content,
            page: row.page ? Number(row.page) : null,
            tokenCount: row.tokenCount,
            metadata: row.metadata as Record<string, unknown> | null,
            score: row.score
        }))
    }

    async searchChunksMany(documentIds: string[], queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]> {
        if (documentIds.length === 0) return [];

        const query = `[${queryEmbedding.join(",")}]`;
        const idList = Prisma.join(documentIds);

        const rows = await prisma.$queryRaw<VectorChunkRow[]>`
        SELECT
            id,
            "documentId",
            "index",
            content,
            "tokenCount",
            metadata,
            CASE WHEN metadata->>'page' IS NOT NULL THEN CAST(metadata->>'page' AS integer) END AS page,
            1 - (embedding <=> ${query}::vector) AS score
        FROM document_chunks
        WHERE "documentId" IN (${idList})
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${query}::vector) >= ${minScore}
        ORDER BY embedding <=> ${query}::vector
        LIMIT ${limit}
        `;

        return rows.map(row => ({
            id: row.id,
            documentId: row.documentId,
            index: row.index,
            content: row.content,
            page: row.page ? Number(row.page) : null,
            tokenCount: row.tokenCount,
            metadata: row.metadata as Record<string, unknown> | null,
            score: row.score
        }))
    }






}