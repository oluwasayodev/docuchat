import {inject, injectable} from "tsyringe";
import {IChatModel} from "./chatModel.interface";
import {AppConfig} from "../lib/config";
import {ChatRequest, ChatStreamChunk} from "../types/chat.types";
import {InternalServerError} from "../errors/http.error";


interface OllamaStreamFrame {
    message?: {
        role?: string;
        content?: string;
        thinking?: string;
    },
    done?: boolean,
    done_reason?: string,
    prompt_eval_count?: number,
    eval_count?: number,
}


function toFinishReason(doneReason?: string) {
    switch (doneReason) {
        case "stop":
            return "STOP";
        case "length":
            return "LENGTH";
        default:
            return "ERROR";
    }
}


@injectable()
export class OllamaChatModel implements IChatModel {

    readonly provider = "ollama" as const;
    private readonly baseUrl: string;

    constructor(@inject(AppConfig) private readonly config: AppConfig) {
        this.baseUrl = config.openaiBaseUrl!.replace(/\/v1\/?$/, "");
    }

    async *generateStream(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
        const controller = new AbortController();
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            signal: request.signal !== undefined ? AbortSignal.any([controller.signal, request.signal]) : controller.signal,
            body: JSON.stringify({
                model: request.model.id,
                messages: request.messages.map(message => ({
                    role: message.role.toLowerCase(),
                    content: message.content
                })),
                stream: true,
                think: request.model.supportsReasoning,
                options: {
                    num_ctx: request.model.contextTokens,
                    num_predict: request.maxOutputTokens,
                    ...(request.temperature != undefined ?
                        {temperature: request.temperature} :{})
                }
            }),
        })
        if (!response.ok || !response.body) {
            throw new InternalServerError(
                `Ollama chat request failed with status ${response.status}`
            )
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            let buffer = "";

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";


                for (const line of lines) {
                    if(!line.trim()) continue;

                    const frame = JSON.parse(line) as OllamaStreamFrame;

                    if (frame.message?.thinking) {
                        yield {type: "reasoning", text: frame.message.thinking};
                    }

                    if (frame.message?.content) {
                        yield {type: "content", text: frame.message.content};
                    }

                    if (frame.done) {
                        yield {
                            type: "usage",
                            usage: {
                                promptTokens: frame.prompt_eval_count ?? 0,
                                completionTokens: frame.eval_count ?? 0,
                                totalTokens: (frame.prompt_eval_count ?? 0) + (frame.eval_count ?? 0),
                            }
                        }

                        yield {type: "finish", reason: toFinishReason(frame.done_reason)}
                    }
                }
            }
        } finally {
            controller.abort();
        }


    }




}