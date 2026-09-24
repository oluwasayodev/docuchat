import {IAuthProvider} from "./authProvider.interface";
import {AuthProviderType} from "@prisma/client";
import {inject, injectable, injectAll} from "tsyringe";
import {InternalServerError} from "../../errors/http.error";
import {ILogger} from "../../logging/logger.interface";


export interface IAuthProviderFactory {
    getProvider(provider: AuthProviderType): IAuthProvider;
}


@injectable()
export class AuthProviderFactory implements IAuthProviderFactory {

    private providers: Map<AuthProviderType, IAuthProvider> = new Map();

    constructor(
        @injectAll("IAuthProvider") providers: IAuthProvider[],
        @inject("ILogger") private logger: ILogger,
    ) {
        providers.forEach((provider: IAuthProvider) => {
            this.providers.set(provider.type, provider);
        })
    }

    public getProvider(type: AuthProviderType): IAuthProvider {
        const provider = this.providers.get(type);
        if (!provider) {
            throw new InternalServerError(`Unsupported authentication provider: ${type}`);
        }
        return provider;
    }


}