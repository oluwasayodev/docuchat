import {RefreshToken} from "@prisma/client";


export interface IRefreshTokenRepository {
    create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken>;
    findByToken(hashedToken: string): Promise<RefreshToken | null>;
    deleteByToken(hashedToken: string): Promise<void>;
    deleteAllForUser(userId: string): Promise<void>;
}