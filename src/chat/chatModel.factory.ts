import {ModelDescriptor} from "./modelDescriptor";
import {IChatModel} from "./chatModel.interface";
import {inject, injectable} from "tsyringe";
import {AppConfig} from "../lib/config";
import {InternalServerError} from "../errors/http.error";
import {OllamaChatModel} from "./ollamaChatModel";
import {OpenAIChatModel} from "./openAIChatModel";


export interface IChatModelFactory {
    resolve(descriptor: ModelDescriptor): IChatModel;
}

@injectable()
export class ChatModelFactory implements IChatModelFactory {

    constructor(@inject(AppConfig) private readonly config: AppConfig) {}

    resolve(descriptor: ModelDescriptor): IChatModel {
        switch (descriptor.provider) {
            case "ollama":
                return new OllamaChatModel(this.config);
            case "openai":
                return new OpenAIChatModel(this.config);
            default:
                throw new InternalServerError(
                    `No chat adapter found for provider "${descriptor.provider}"`,
                );
        }
    }


}