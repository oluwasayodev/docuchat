import {IAuthProvider, VerifiedAuthPayload} from "./authProvider.interface";
import {AuthProviderType} from "@prisma/client";
import {Client} from "pg";
import {CognitoJwtVerifier} from "aws-jwt-verify";
import {CognitoJwt} from "aws-jwt-verify/jwt-model";
import {CognitoJwtVerifierMultiProperties} from "aws-jwt-verify/cognito-verifier";
import {UnauthorizedException} from "../../errors/http.error";
import {inject, injectable} from "tsyringe";
import {AppConfig} from "../../lib/config";


@injectable()
export class CognitoAuthProvider implements IAuthProvider {
    readonly type = AuthProviderType.COGNITO;
    private cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {}


    async verifyToken(token: string): Promise<VerifiedAuthPayload> {

        try {
            const payload = await this.getVerifier().verify(token);
            if (!payload.sub || !payload.email) {
                throw new UnauthorizedException("Invalid cognito payload token");
            }

            return {
                providerId: payload.sub,
                email: payload.email as string,
                name: (payload.name as string) || (payload.email as string).split("@")[0],
            }
        } catch {
            throw new UnauthorizedException("CognitoAuthProvider authentication failed");
        }
    }

    private getVerifier() {
        if(!this.cognitoVerifier) {
            const userPoolId = this.appConfig.cognitoUserPoolId!;
            const clientId = this.appConfig.cognitoClientId!;
            if (!userPoolId || !clientId) {
                throw new Error("CognitoAuthProvider.getVerifier() is missing");
            }
            this.cognitoVerifier = CognitoJwtVerifier.create({
                tokenUse: "id",
                userPoolId,
                clientId,
            })
        }
        return this.cognitoVerifier;
    }


}