import {
    Controller,
    Middlewares,
    Post,
    Security,
    SuccessResponse,
    Request,
    Get,
    Query,
    Path,
    Delete,
    Route,
    Tags
} from "tsoa";
import {inject, injectable} from "tsyringe";
import {DocumentService} from "../services/document.service";
import {Serialize} from "../middleware/serialize.middleware";
import {AppConfig} from "../lib/config";
import {ChunkResponse, DocumentListResponse, DocumentResponse} from "../dtos/document.dto";
import {Request as ExpressRequest} from "express";
import {documentUpload} from "../middleware/upload.middleware";
import {container} from "../container";
import {BadRequestException} from "../errors/http.error";
import {DocumentSortField} from "../repositories/documentRepository.interface";
import {SortOrder} from "../types/pagination.type";
import {DocumentStatus} from "@prisma/client";


@injectable()
@Route("documents")
@Tags("documents")
export class DocumentController extends Controller{

    constructor(
        @inject("IDocumentService") private documentService: DocumentService,
    ) {
        super();
    }


    @Post()
    @SuccessResponse("201", "Created")
    @Security("jwt")
    @Middlewares(documentUpload(container.resolve(AppConfig)), Serialize(DocumentResponse))
    async upload(@Request() req: ExpressRequest): Promise<DocumentResponse> {
        if (!req.file) {
            throw new BadRequestException("File is required");
        }

        const file = {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            buffer: req.file.buffer
        };

        const data = {
            ...(req?.body?.name ? {name: String(req.body.name)} : {}),
            ...(req?.body?.description ? {description: String(req.body?.description)} : {}),
        }

        const document = await this.documentService.upload(req.user!.id, file, data);
        return document as DocumentResponse;
    }

    @Get()
    @SuccessResponse("201", "OK")
    @Security("jwt")
    @Middlewares(Serialize(DocumentListResponse))
    async list(
        @Request() req: ExpressRequest,
        @Query() page?: number,
        @Query() limit?: number,
        @Query() sortBy?: DocumentSortField,
        @Query() sortOrder?: SortOrder,
        @Query() status?: DocumentStatus,
        @Query() search?: string
    ): Promise<DocumentListResponse> {

        const result = await this.documentService.listByUserId(req.user!.id, {
            page, limit, sortBy, sortOrder, status, search
        })

        return result as DocumentListResponse;
    }


    @Get("{id}")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(DocumentResponse))
    async get(@Request() req: ExpressRequest, @Path() id: string): Promise<DocumentResponse> {
        const document = await this.documentService.getWithUrl(req.user!.id, id);
        return document as DocumentResponse;
    }

    @Get("{id}/download")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    async download(@Request() req: ExpressRequest, @Path() id: string): Promise<void> {
        const {document, buffer, mimeType} = await this.documentService.getDownload(req.user!.id, id);
        const res = req.res!;
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(document.name)}"`)
        res.setHeader("Content-Length", String(buffer.length));
        res.end(buffer);
    }

    @Get("{id}/chunks")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(ChunkResponse))
    async chunks(@Request() req: ExpressRequest, @Path() id: string): Promise<ChunkResponse[]> {
        const chunks = await this.documentService.listChunks(req.user!.id, id);
        return chunks as ChunkResponse[];
    }


    @Delete("{id}")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(DocumentResponse))
    async remove(@Request() req: ExpressRequest, @Path() id: string): Promise<DocumentResponse> {
        const document = await this.documentService.remove(req.user!.id, id);
        return document as DocumentResponse;
    }

    @Post("{id}/reprocess")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(DocumentResponse))
    async reprocess(@Request() req: ExpressRequest, @Path() id: string): Promise<DocumentResponse> {

        const document = await this.documentService.reprocess(req.user!.id, id);
        return document as DocumentResponse;
    }
}

function sanitizeFilename(name: string): string {
    return name.replace(/["\\\r\n]/g, "_");

}