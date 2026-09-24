import {IBaseRepository} from "./baseRepository.interface";
import {IRefreshTokenRepository} from "./refreshTokenRepository.interface";
import {PrismaClient, RefreshToken} from "@prisma/client";
import {inject, injectable} from "tsyringe";


@injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {

    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
        return this.prisma.refreshToken.create({data: {userId, token, expiresAt}});
    }

    async deleteByToken(hashedToken: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: {token: hashedToken, deletedAt: null},
            data: { deletedAt: new Date()}
        });
    }

    async findByToken(hashedToken: string): Promise<RefreshToken | null> {
        return this.prisma.refreshToken.findFirst({where: {token: hashedToken, deletedAt: null}})

    }

    async deleteAllForUser(userId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({where: { userId, deletedAt: null }, data: {deletedAt: new Date()}});
    }




}