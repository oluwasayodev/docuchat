import {IAuthProvider, VerifiedAuthPayload} from "./authProvider.interface";
import {AuthProviderType} from "@prisma/client";
import {OAuth2Client} from "google-auth-library";
import {AppConfig} from "../../lib/config";
import {UnauthorizedException} from "../../errors/http.error";
import {inject, injectable} from "tsyringe";


@injectable()
export class GoogleAuthProvider implements IAuthProvider {
    readonly type = AuthProviderType.GOOGLE;
    private client: OAuth2Client;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {
        this.client = new OAuth2Client(this.appConfig.googleClientId || 'abc');
    }

    async verifyToken(token: string): Promise<VerifiedAuthPayload> {
        try {
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                audience: this.appConfig.googleClientId
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email || !payload.sub) {
                throw new UnauthorizedException("Invalid google token payload");
            }

            return {
                providerId: payload.sub,
                email: payload.email,
                name: payload.name || payload.email.split("@")[0]
            }
        } catch {
            throw new UnauthorizedException("Google authentication failed");
        }
    }


}