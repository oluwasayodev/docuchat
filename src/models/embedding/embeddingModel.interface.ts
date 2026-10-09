

export interface IEmbeddingModel {
    readonly modelId: string;
    embed(
        inputs: string[],
        onBatch?: (done: number, total: number) => Promise<void> | void,
    ): Promise<number[][]>;
}