import {inject, injectable} from "tsyringe";
import {ChunkInput, IChunkStore, SearchChunkResult, StoredChunk} from "./chunkStore.interface";
import {Client as ElasticSearchClient} from '@elastic/elasticsearch'
import {AppConfig} from "../lib/config";
import {Record} from "@prisma/client/runtime/client";
import {response} from "express";
import {exists} from "node:fs";
import {number} from "zod";


@injectable()
export class ElasticSearchChunkStore implements IChunkStore {

    private readonly client: ElasticSearchClient;
    private readonly indexName: string;
    private readonly ready: Promise<void>;


    constructor(@inject(AppConfig) private readonly config: AppConfig) {
        this.client = new ElasticSearchClient({node: this.config.esNode})
        this.indexName = `${this.config.esIndexPrefix}-chunks`;
        this.ready = this.ensureIndex();
    }

    async deleteForDocument(documentId: string): Promise<void> {
        await this.ready;

        await this.client.deleteByQuery({
            index: this.indexName,
            query: {term: {documentId}},
            refresh: true,
        })
    }

    async replaceChunks(documentId: string, chunks: ChunkInput[]): Promise<void> {
        await this.ready

        await this.client.deleteByQuery({
            index: this.indexName,
            query: {term: {documentId}},
            refresh: true
        })

        const operations = chunks.flatMap(chunk => [
            {index: {_index: this.indexName, _id: `${documentId}:${chunk.index}`}},
            {
                documentId,
                index: chunk.index,
                content: chunk.content,
                page: (chunk.metadata?.page as number | undefined) ?? null,
                tokenCount: chunk.tokenCount,
                metadata: chunk.metadata ?? {},
                ...(chunk.embedding ? {embedding: chunk.embedding} : {}),
                createdAt: new Date()
            }
        ])

        if (operations.length > 0) {
            await this.client.bulk({operations, refresh: true})
        }
    }

    async listChunks(documentId: string, limit: number): Promise<StoredChunk[]> {
        await this.ready;

        const response = await this.client.search<{
            index: number;
            content: string;
            page?: number | null;
            tokenCount: number;
            metadata: Record<string, unknown>;
            createdAt: string;
        }>({
            index: this.indexName,
            size: limit,
            query: {term: {documentId}},
            sort: [{index: {order: "asc"}}]
        })

        return response.hits.hits.map(hit => ({
            id: hit._id ?? "",
            index: hit._source!.index,
            content: hit._source!.content,
            page: hit._source!.page ?? null,
            tokenCount: hit._source!.tokenCount,
            metadata: hit._source!.metadata ?? null,
            createdAt: new Date(hit._source!.createdAt),
        }))
    }

    async searchChunks(documentId: string, queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]> {
        await this.ready;

        const response = await this.client.search<{
            index: number;
            content: string;
            page?: number | null;
            tokenCount: number;
            metadata: Record<string, unknown>
        }>({
            index: this.indexName,
            size: limit,
            knn: {
                field: "embedding",
                query_vector: queryEmbedding,
                k: limit,

                num_candidates: limit * 10,
                filter: {term: {documentId}}
            }
        })

        return response.hits.hits
            .filter(hit => (hit._score ?? 0) >= minScore)
            .map(hit => ({
            id: hit._id ?? "",
            documentId,
            index: hit._source!.index,
            content: hit._source!.content,
            page: hit._source!.page ?? null,
            tokenCount: hit._source!.tokenCount,
            metadata: hit._source!.metadata ?? null,
            score: hit._score ?? 0,
        }))
    }

    async searchChunksMany(documentIds: string[], queryEmbedding: number[], limit: number, minScore: number): Promise<SearchChunkResult[]> {
        await this.ready;

        const response = await this.client.search<{
            documentId: string;
            index: number;
            content: string;
            page?: number | null;
            tokenCount: number;
            metadata: Record<string, unknown>;
        }>({
            index: this.indexName,
            size: limit,
            knn: {
                field: "embedding",
                query_vector: queryEmbedding,
                k: limit,
                num_candidates: limit * 10,
                filter: {terms: {documentId: documentIds}}
            }
        })

        return response.hits.hits
            .filter(hit => (hit._score ?? 0) >= minScore)
            .map(hit => ({
            id: hit._id ?? "",
            documentId: hit._source!.documentId,
            index: hit._source!.index,
            content: hit._source!.content,
            page: hit._source!.page ?? null,
            tokenCount: hit._source!.tokenCount,
            metadata: hit._source!.metadata ?? null,
            score: hit._score ?? 0,
        }))
    }





    private async ensureIndex(): Promise<void> {
        const exists = await this.client.indices.exists({index: this.indexName});
        if (!exists) {
            await this.client.indices.create({
                index: this.indexName,
                mappings: {
                    properties: {
                        documentId: {type: "keyword"},
                        index: {type: "integer"},
                        content: {type: "text", analyzer: "english"},
                        page: {type: "integer"},
                        tokenCount: {type: "integer"},
                        metadata: {type: "flattened"},
                        embedding: {
                            type: "dense_vector",
                            dims: this.config.embeddingDimensions,
                            index: true,
                            similarity: "cosine"
                        },
                        createdAt: {type: "date"}
                    }
                }
            });
        }
    }


}