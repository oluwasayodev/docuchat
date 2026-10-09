import {ModelDescriptor} from "./modelDescriptor";
import {AppConfig} from "../lib/config";
import {InternalServerError} from "../errors/http.error";


export interface IChatModelRegistry {
    get(modelId: string): ModelDescriptor;
    list(): ModelDescriptor[];
}

export class ChatModelRegistry implements IChatModelRegistry {

    private readonly models: Map<string, ModelDescriptor>;

    constructor(
        private readonly config: AppConfig,
        descriptors: ModelDescriptor[],
    ) {

        this.models = new Map<string, ModelDescriptor>();
        for (const descriptor of descriptors) {
            if (this.models.has(descriptor.id)) {
                throw new Error(`Duplicate chat model with id ${descriptor.id}`);
            }
            this.models.set(descriptor.id, descriptor);
        }

        if (!this.models.has(this.config.chatModel)) {
            throw new Error(
                `CHAT_MODEL="${this.config.chatModel}" is not a registered model`
            )
        }

    }

    get(modelId: string): ModelDescriptor {
        const descriptor = this.models.get(modelId);
        if (!descriptor) {
            throw new InternalServerError(`Unknown chat model: ${modelId}`);
        }

        return descriptor;
    }

    list(): ModelDescriptor[] {
        return [...this.models.values()];
    }


}