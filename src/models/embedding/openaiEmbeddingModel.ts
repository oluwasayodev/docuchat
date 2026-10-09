import {inject, injectable} from "tsyringe";
import {IEmbeddingModel} from "./embeddingModel.interface";
import OpenAI from "openai";
import {AppConfig} from "../../lib/config";


@injectable()
export class OpenAIEmbeddingModel implements IEmbeddingModel{
    readonly modelId: string;
    private readonly client: OpenAI

    constructor(@inject(AppConfig) private readonly config: AppConfig) {
        this.modelId = this.config.embeddingModel;
        this.client = new OpenAI({
            apiKey: this.config.openaiApiKey,
            baseURL: this.config.openaiBaseUrl,
            timeout: 270 * 1000
        })
    }

    async embed(
        inputs: string[],
        onBatch?: (done: number, total: number) => Promise<void> | void,
    ): Promise<number[][]> {

        const embeddings: number[][] = [];
        const total = inputs.length;

        for (let i = 0; i < inputs.length; i+= 8) {
            const batch = inputs.slice(i, i + 8);
            const response = await this.client.embeddings.create({
                model: this.modelId,
                input: batch,
                dimensions: this.config.embeddingDimensions
            });
            embeddings.push(...response.data.map(item => item.embedding));
            if (onBatch) await onBatch(embeddings.length, total);
        }

        return embeddings;
    }



}