import {ChatRequest, ChatStreamChunk, FinishReason} from "../types/chat.types";
import {inject, injectable} from "tsyringe";
import {IChatModel} from "./chatModel.interface";
import OpenAI from "openai";
import {AppConfig} from "../lib/config";


function toFinishReason(finishReason: string | null | undefined): FinishReason {
    switch (finishReason) {
        case "stop":
            return "STOP";
        case "length":
            return "LENGTH";
        default:
            return "ERROR";
    }
}


@injectable()
export class OpenAIChatModel implements IChatModel {

    readonly provider = "openai" as const;
    private readonly client: OpenAI;

    constructor(@inject(AppConfig) config: AppConfig) {
        this.client = new OpenAI({
            apiKey: config.openaiApiKey,
            baseURL: config.openaiBaseUrl,
            timeout: 270 * 1000,
        });
    }

    async *generateStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
        const stream = await this.client.chat.completions.create({
            model: request.model.id,
            messages: request.messages.map(message => ({
                role: message.role.toLowerCase() as "system" | "user" | "assistant",
                content: message.content
            })),
            stream: true,
            max_completion_tokens: request.maxOutputTokens,
            stream_options: {include_usage: true},
            ...(request.temperature !== undefined ?
                    {temperature: request.temperature} : {}
            )
        });

        for await (const chunk of stream) {
            const delta = chunk.choices?.[0].delta as | {reasoning?: string} | undefined;
            const reasoning = delta?.reasoning;
            if (reasoning) {
                yield {type: "reasoning", text: reasoning};
            }

            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
                yield {type: "content", text: content};
            }

            if (chunk.usage) {
                yield {
                    type: "usage",
                    usage: {
                        promptTokens: chunk.usage.prompt_tokens,
                        completionTokens: chunk.usage.completion_tokens,
                        totalTokens: chunk.usage.total_tokens,
                    }
                }
            }

            const finishReason = chunk.choices?.[0]?.finish_reason;
            if (finishReason) {
                yield {type: "finish", reason: toFinishReason(finishReason)}
            }
        }
    }


}