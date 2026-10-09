import {ArrayMaxSize, ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength} from "class-validator";
import {Exclude, Expose, Type} from "class-transformer";
import {PageMeta} from "../types/pagination.type";
import {DocumentStatus, MessageRole} from "@prisma/client";


export class CreateConversationRequest {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title?: string;
}

export class UpdateConversationRequest {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title!: string;
}

export class AttachDocumentsRequest {
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(100)
    @IsString({each: true})
    documentIds!: string[];
}


@Exclude()
export class ConversationResponse {

    @Expose() id!: string;
    @Expose() title!: string | null;
    @Expose() createdAt!: Date;
    @Expose() updatedAt!: Date;
}


@Exclude()
export class ConversationListResponse {
    @Expose()
    @Type(() => ConversationResponse)
    items!: ConversationResponse[];

    @Expose()
    meta!: PageMeta
}


@Exclude()
export class ConversationAttachmentResponse {
    @Expose() documentId!: string;
    @Expose() name!: string;
    @Expose() status!: DocumentStatus;
}

@Exclude()
export class ConversationDetailResponse {
    @Expose() id!: string;
    @Expose() title!: string | null;
    @Expose() createdAt!: Date;
    @Expose() updatedAt!: Date;

    @Expose()
    @Type(() => ConversationAttachmentResponse)
    documents!: ConversationAttachmentResponse[];
}


export class MessageResponse {
    @Expose() id!: string;
    @Expose() role!: MessageRole;
    @Expose() content!: string;
    @Expose() modelId!: string | null;
    @Expose() tokenCount!: number;
    @Expose() costUsd!: number | null;
    @Expose() createdAt!: Date;

}


export class SendMessageRequest {

    @IsString()
    @IsNotEmpty()
    @MaxLength(4000)
    question!: string;

    @IsOptional()
    @IsString()
    modelId?: string;
}