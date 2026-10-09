import {IEmbeddingModel} from "./embeddingModel.interface";
import {inject, injectable, injectAll} from "tsyringe";
import {AppConfig} from "../../lib/config";
import {InternalServerError} from "../../errors/http.error";


export interface IEmbeddingModelFactory {
    resolve(modelId?: string): IEmbeddingModel;
}

@injectable()
export class EmbeddingModelFactory implements IEmbeddingModelFactory {

    constructor(
        @inject(AppConfig) private readonly config: AppConfig,
        @injectAll("IEmbeddingModel") private readonly models: IEmbeddingModel[]
    ) {
        const ids = this.models.map(model => model.modelId);
        const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        if (duplicates.length > 0) {
            throw new Error(`Duplicate embedding model ids: ${duplicates.join(', ')}`);
        }
    }

    resolve(modelId?: string): IEmbeddingModel {
        const target = modelId ?? this.config.embeddingModel;
        const model = this.models.find(candidate => candidate.modelId === target);

        if (!model) {
            throw new InternalServerError(`No embedding model registered for ${target}`)
        }

        return model;
    }


}