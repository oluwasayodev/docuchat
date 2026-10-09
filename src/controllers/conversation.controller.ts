import {inject, injectable} from "tsyringe";
import {
    Body,
    Controller, Delete,
    Get,
    Middlewares, Patch,
    Path,
    Post,
    Query,
    Request,
    Route,
    Security,
    SuccessResponse,
    Tags
} from "tsoa";
import {IConversationService} from "../services/conversationService.interface";
import {validateDtoMiddleware} from "../middleware/validate.middleware";
import {
    AttachDocumentsRequest,
    ConversationAttachmentResponse,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    CreateConversationRequest, MessageResponse, SendMessageRequest, UpdateConversationRequest
} from "../dtos/conversation.dto";
import {Serialize} from "../middleware/serialize.middleware";
import {Request as ExpressRequest} from 'express'
import {ConversationSortField} from "../repositories/conversationRepository.interface";
import {SortOrder} from "../types/pagination.type";
import {IChatService} from "../services/chatService.interface";
import {InternalServerError} from "../errors/http.error";
import {clearTimeout} from "node:timers";

const FIRST_FRAME_TIMEOUT_MS = 120_000;
const IDLE_TIMEOUT_MS = 60_000;

@injectable()
@Route('conversations')
@Tags('conversations')
export class ConversationController extends Controller {

    constructor(
        @inject("IConversationService") private readonly conversationService: IConversationService,
        @inject("IChatService") private readonly chatService: IChatService
    ) {
        super();
    }

    @Post()
    @SuccessResponse("201", "Conversation created successfully.")
    @Security("jwt")
    @Middlewares(validateDtoMiddleware(CreateConversationRequest), Serialize(ConversationResponse))
    async createConversation(
        @Request() req: ExpressRequest,
        @Body() dto: CreateConversationRequest
    ): Promise<ConversationResponse> {
        return await this.conversationService.create(req.user!.id, dto.title);
    }


    @Get()
    @SuccessResponse("200", "OK")
    @Security("jwt")
    async list(
        @Request() req: ExpressRequest,
        @Query() page?: number,
        @Query() limit?: number,
        @Query() sortBy?: ConversationSortField,
        @Query() sortOrder?: SortOrder

    ): Promise<ConversationListResponse> {
        const result = await this.conversationService.list(req.user!.id,
            {page, limit, sortBy, sortOrder}
        )

        return result as ConversationListResponse;

    }

    @Get("{id}")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(ConversationDetailResponse))
    async get(@Request() req: ExpressRequest, @Path() id: string): Promise<ConversationDetailResponse> {

        const {conversation, documents} = await this.conversationService.get(req.user!.id, id);
        return {...conversation, documents} as ConversationDetailResponse;
    }

    @Patch("{id}")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(validateDtoMiddleware(UpdateConversationRequest), Serialize(ConversationDetailResponse))
    async rename(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Body() dto: UpdateConversationRequest
    ): Promise<ConversationResponse> {

        const conversation = await this.conversationService.rename(req.user!.id, id, dto.title);
        return conversation as ConversationResponse;
    }

    @Delete("{id}")
    @SuccessResponse("204", "No Content")
    @Security("jwt")
    async remove(@Request() req: ExpressRequest, @Path() id: string): Promise<void> {
        await this.conversationService.remove(req.user!.id, id);
    }

    @Get("{id}/messages")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(Serialize(MessageResponse))
    async messages(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Query() limit?: number,
    ): Promise<MessageResponse[]> {
        const messages = await this.conversationService.listMessages(req.user!.id, id, limit ?? 50);
        return messages as MessageResponse[];
    }

    @Post("{id}/documents")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(validateDtoMiddleware(AttachDocumentsRequest), Serialize(ConversationAttachmentResponse))
    async attach(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Body() dto: AttachDocumentsRequest,
    ): Promise<ConversationAttachmentResponse[]> {
        const documents = await this.conversationService.attachDocuments(req.user!.id, id, dto.documentIds);
        return documents as ConversationAttachmentResponse[];
    }


    @Delete("{id}/documents/{documentId}")
    @SuccessResponse("204", "No content")
    @Security("jwt")
    async detach(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Path() documentId: string,
    ): Promise<void> {
      return this.conversationService.detachDocuments(req.user!.id, id, documentId);
    }


    @Post("{id}/messages")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(validateDtoMiddleware(SendMessageRequest))
    async streamMessage(
        @Request() req: ExpressRequest,
        @Path() id: string,
        @Body() dto: SendMessageRequest
    ): Promise<void> {
        const res = (req as ExpressRequest & {res: Response}).res;
        const abort = new AbortController();
        const iterator = this.chatService.chat({
            userId: req.user!.id,
            conversationId: id,
            question: dto.question,
            modelId: dto.modelId,
            signal: abort.signal
        })[Symbol.asyncIterator]();

        let headersSent = false;
        const onClose = (): void => {
            abort.abort();
            void iterator.return?.().catch(() => undefined);
        };
        res.on("close", onClose);

        try {
            for (;;) {
                const timeoutMs = headersSent ? IDLE_TIMEOUT_MS : FIRST_FRAME_TIMEOUT_MS;
                const result = await this.withTimeout(iterator.next(), timeoutMs);
                if (result.done) break;

                if (!headersSent) {
                    res.status(200);
                    res.setHeader("Content-Type", "text/event-stream");
                    res.setHeader("Cache-Control", "no-cache, no-transform");
                    res.setHeader("X-Accel-Buffering", "no")
                    res.flushHeaders()
                    headersSent = true;
                }

                const event = result.value;
                res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
            }
            if (!res.writableEnded && !res.destroyed) {
                res.end()
            }
        } catch (error) {
            if (res.destroyed || res.writableEnded) return ;
            if (!headersSent) throw error;
            const message = error instanceof Error ? error.message : String(error);
            res.write(`event: error\ndata: ${JSON.stringify(message)}\n\n`);
            res.end();
        } finally {
            res.off("close", onClose);
            abort.abort();
            void iterator.return?.().catch(() => undefined);
        }
    }

    private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        let timer: NodeJS.Timeout | undefined;
        return Promise.race([
            promise,
            new Promise<never>((_, reject)  => {
                timer = setTimeout(() => reject(new InternalServerError("Chat stream timed out")), ms);
            })
        ]).finally(() => clearTimeout(timer));
    }
}