import {Exclude, Expose, Type} from "class-transformer";
import {DocumentStatus} from "@prisma/client";
import {PageMeta} from "../types/pagination.type";
import {Record} from "@prisma/client/runtime/client";
import {IsInt, IsNotEmpty, IsOptional, IsString, Max, Min} from "class-validator";


@Exclude()
export class DocumentResponse {
    @Expose() id!: string;
    @Expose() name!: string;
    @Expose() description!: string | null;
    @Expose() mimeType!: string;
    @Expose() sizeBytes!: number;
    @Expose() status!: DocumentStatus;
    @Expose() processingError!: string | null;
    @Expose() pageCount!: number | null;
    @Expose() chunkCount!: number | null;
    @Expose() processedAt!: Date | null;
    @Expose() createdAt!: Date;
    @Expose() updatedAt!: Date;
    @Expose() url?: string;
}


@Exclude()
export class DocumentListResponse {
    @Expose()
    @Type(() => DocumentResponse)
    items!: DocumentResponse[];

    @Expose()
    meta!: PageMeta;
}


@Exclude()
export class ChunkResponse {
    @Expose() index!: number;
    @Expose() content!: string;
    @Expose() tokenCount!: number;
    @Expose() metadata!: Record<string, unknown> | null;
}

export class SearchRequest {
    @IsString()
    @IsNotEmpty()
    query!: string;

    @IsInt()
    @Min(1)
    @Max(20)
    @IsOptional()
    limit?: number;
}

@Exclude()
export class DocumentSearchResponse {

    @Expose() documentId!: string;
    @Expose() query!: string;

    @Expose()
    @Type(() => SearchChunkDto)
    chunks!: SearchChunkDto[];
}


@Exclude()
export class SearchChunkDto {
    @Expose() id!: string;
    @Expose() index!: number;
    @Expose() content!: string;
    @Expose() page!: number | null;
    @Expose() tokenCount!: number;
    @Expose() score!: number;
}