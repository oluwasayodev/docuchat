import {AuthProviderType} from "@prisma/client";


export interface VerifiedAuthPayload {
    providerId: string;
    email: string;
    name: string;
}

export interface IAuthProvider {
    readonly type: AuthProviderType;
    verifyToken(token: string): Promise<VerifiedAuthPayload>;
}