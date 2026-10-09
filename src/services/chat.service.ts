import {inject, injectable} from "tsyringe";
import {ChatContext, ChatEvent, ChatInput, IChatService} from "./chatService.interface";
import {IChatModelRegistry} from "../chat/chatModelRegistry";
import {AppConfig} from "../lib/config";
import {ModelDescriptor} from "../chat/modelDescriptor";
import {MessageRole} from "../types/conversation.types";
import {ChatMessage, ChatRequest, ChatRole, FinishReason, TokenUsage} from "../types/chat.types";
import {IConversationRepository} from "../repositories/conversationRepository.interface";
import {IChunkStore, SearchChunkResult} from "../stores/chunkStore.interface";
import {IEmbeddingModelFactory} from "../models/embedding/embeddingModel.factory";
import {dedupeAdjacentChunks, planRetrieval} from "../chat/retrievalPlan";
import {buildChatMessages} from "../prompts/chat.prompt";
import {InternalServerError, NotFoundError} from "../errors/http.error";
import {IChatModelFactory} from "../chat/chatModel.factory";
import {estimateTokens} from "./tokenEstimator";
import {IUsageLogRepository} from "../repositories/usageLogRepository.interface";
import {ILogger} from "../logging/logger.interface";

const HISTORY_FETCH_LIMIT = 40;

function toChatRole(role: MessageRole): ChatRole {

    switch(role) {
        case "USER":
            return "USER";
        case "ASSISTANT":
            return "ASSISTANT";
        case "SYSTEM":
            return "SYSTEM";
            default:
                throw new Error("Unsupported message role: " + role);
    }
}


@injectable()
export class ChatService implements IChatService {

    constructor(
        @inject("ChatModelRegistry") private registry: IChatModelRegistry,
        @inject(AppConfig) private config: AppConfig,
        @inject("IConversationRepository") private readonly conversations: IConversationRepository,
        @inject("IChunkStore") private readonly chunkStore: IChunkStore,
        @inject("IEmbeddingModelFactory") private readonly embeddings: IEmbeddingModelFactory,
        @inject("IChatModelFactory") private readonly chatModels: IChatModelFactory,
        @inject("IUsageLogRepository") private readonly usageLogRepository: IUsageLogRepository,
        @inject("ILogger")private readonly logger: ILogger,
    ) {}

    listModels(): ModelDescriptor[] {
        return this.registry.list()
    }

    resolveModel(modelId?: string): ModelDescriptor {
        return this.registry.get(modelId ?? this.config.chatModel)
    }

    async prepareContext(userId:string, conversationId: string, question: string, descriptor: ModelDescriptor): Promise<ChatContext> {
        const conversation = await this.conversations.findOwnByUserId(userId, conversationId);
        if (!conversation) {
            throw new NotFoundError("Conversation not found");
        }
        const records = await this.conversations.listMessages(conversationId, HISTORY_FETCH_LIMIT);
        const history: ChatMessage[] = records.map(record => ({
            role: toChatRole(record.role),
            content: record.content,
        }))

        const plan = planRetrieval(
            descriptor,
            question,
            history,
            {sizeTokens: this.config.documentChunkSizeTokens, overheadTokens: 0},
            this.config.maxRetrievalChunks
        )

        const chunks = await this.retrieve(conversationId, question, plan.limit);

        return {
            plan,
            chunks,
            messages: buildChatMessages(plan.history, chunks, question)
        }
    }


    private async retrieve(conversationId: string, question: string, limit: number): Promise<SearchChunkResult[]> {
        if (this.config.embeddingDriver === "none") return [];

        if (limit === 0) return [];

        const attachments = await this.conversations.listAttachedDocuments(conversationId);

        const ready = attachments
            .filter(attachment => attachment.status === "READY")
            .map(attachment => attachment.documentId);


        if (ready.length === 0) return [];

        const [queryEmbedding] = await this.embeddings.resolve().embed([question]);

        const found = await this.chunkStore.searchChunksMany(ready, queryEmbedding, limit * 2, this.config.minScore);
        return dedupeAdjacentChunks(found).slice(0, limit);

    }

    async *chat(input: ChatInput): AsyncIterable<ChatEvent> {
        const descriptor = this.resolveModel(input.modelId);

        const context = await this.prepareContext(
            input.userId,
            input.conversationId,
            input.question,
            descriptor,
        );

        yield {type: "citations", chunks: context.chunks};

        await this.conversations.addMessage({
            conversationId: input.conversationId,
            role: "USER",
            content: input.question,
            tokenCount: estimateTokens(input.question),
            costUsd: null
        })


        const request: ChatRequest = {
            model: descriptor,
            messages: context.messages,
            maxOutputTokens: descriptor.maxOutputTokens,
            temperature: this.config.chatTemperature,
            signal: input.signal,
        }

        const model = this.chatModels.resolve(descriptor);

        let buffer = "";
        let usage: TokenUsage | null = null;
        let finishReason: FinishReason = "ERROR";

        try {
            for await (const chunk of model.generateStream(request)) {
                switch (chunk.type) {
                    case "reasoning":
                        yield {type: "reasoning", text: chunk.text}
                        break;
                    case "content":
                        buffer += chunk.text;
                        yield {type: "content", text: chunk.text}
                        break;
                    case "usage":
                        usage = chunk.usage;
                        break;
                    case "finish":
                        finishReason = chunk.reason;
                        break;

                }
            }
        } catch (error) {
            throw new InternalServerError(
                `Chat generation failed: ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        const saved = await this.conversations.addMessage({
            conversationId: input.conversationId,
            role: "ASSISTANT",
            content: buffer,
            modelId: descriptor.id,
            tokenCount: usage ? usage.completionTokens : estimateTokens(buffer),
            costUsd: null
        });

        await this.logCompletionUsage({
            userId: input.userId,
            conversationId: input.conversationId,
            messageId: saved.id,
            modelId: descriptor.id,
            usage,
            fallbackTokens: estimateTokens(buffer),
            finishReason,
            chunksUsed: context.chunks.length
        })

        yield {type: "done", messageId: saved.id, finishReason, usage}
    }

    private async logCompletionUsage(entry: {
        userId: string;
        conversationId: string;
        messageId: string;
        modelId: string;
        usage: TokenUsage | null;
        fallbackTokens: number;
        finishReason: FinishReason;
        chunksUsed: number
    }): Promise<void> {
        try {
            await this.usageLogRepository.createUsageLog({
                userId: entry.userId,
                action: "CHAT_COMPLETION",
                tokens: entry.usage ? entry.usage.totalTokens : entry.fallbackTokens,
                costUsd: null,
                metadata: {
                    conversationId: entry.conversationId,
                    messageId: entry.messageId,
                    modelId: entry.modelId,
                    finishReason: entry.finishReason,
                    promptTokens: entry.usage?.promptTokens ?? null,
                    completionTokens: entry.usage?.completionTokens ?? null,
                    chunksUsed: entry.chunksUsed

                }
            })
        } catch (error) {
            this.logger.error("Failed to log CHAT_COMPLETION usage", error, {
                conversationId: entry.conversationId,
                modelId: entry.modelId,
            });
        }
    }


}