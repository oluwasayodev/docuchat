import {AuthTokens, IAuthService} from "./authService.interface";
import {LoginRequest, RefreshTokenRequest, RegisterRequest} from "../dtos/auth.dto";
import {inject, injectable} from "tsyringe";
import bcrypt from "bcryptjs";
import {IUserRepository} from "../repositories/userRepository.interface";
import {IRefreshTokenRepository} from "../repositories/refreshTokenRepository.interface";
import {ConflictException, InternalServerError, UnauthorizedException} from "../errors/http.error";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {config} from "../lib/config";
import {PrismaClient} from "@prisma/client";




@injectable()
export class AuthService implements IAuthService {

    constructor(
        @inject("IUserRepository") private userRepository: IUserRepository,
        @inject("IRefreshTokenRepository") private refreshTokenRepository: IRefreshTokenRepository,
        @inject(PrismaClient) private prisma: PrismaClient,
    ) {}

    async login(dto: LoginRequest): Promise<AuthTokens> {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user || !await bcrypt.compare(dto.password, user.passwordHash)) {
            throw new UnauthorizedException("Invalid Credentials");
        }
        return this.generateTokenPair(user);
    }

    async logout(refreshToken: string): Promise<void> {
        const hashedToken = this.hashToken(refreshToken);
        await this.refreshTokenRepository.deleteByToken(hashedToken);
    }

    async refreshToken(dto: RefreshTokenRequest): Promise<AuthTokens> {
        const hashedToken = this.hashToken(dto.refreshToken);
        const storedToken = await this.refreshTokenRepository.findByToken(hashedToken);


        if (!storedToken) {
            throw new UnauthorizedException("Invalid or revoked refresh token");
        }

        if (storedToken.expiresAt < new Date()) {
            await this.refreshTokenRepository.deleteByToken(hashedToken);
            throw new UnauthorizedException("Refresh token expired");
        }

        const user = await this.userRepository.findById(storedToken.userId);
        if (!user) {
            throw new UnauthorizedException("Invalid or revoked user");
        }
        await this.refreshTokenRepository.deleteByToken(hashedToken);
        return this.generateTokenPair(user);
    }

    async register(dto: RegisterRequest): Promise<AuthTokens> {
        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing) throw new ConflictException("Email already exists");

        const passwordHash = await bcrypt.hash(dto.password, config.BCRYPT_SALT_ROUNDS);

        let roleId = dto.roleId;

        if (!dto.roleId){
            const defaultRole = await this.prisma.role.findUnique({where: {name: "USER"}})

            if (!defaultRole) {
                throw new InternalServerError("System roles not initialized");
            }

            roleId = defaultRole.id;


        }

        const user = await this.userRepository.create({
            email: dto.email,
            passwordHash: passwordHash,
            name: dto.name,
            roleId
        });
        
        return this.generateTokenPair(user);


    }


    private async generateTokenPair(user: any): Promise<AuthTokens> {

        const accessPayload = {
            id: user.id,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions.map((p: any) => p.action)
        }

        const accessToken = jwt.sign(
            accessPayload,
            config.JWT_SECRET,
            {expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]}
        )

        const plainRefreshToken = crypto.randomBytes(40).toString('hex')
        const hashedRefreshToken = this.hashToken(plainRefreshToken);

        const expiresAt  = new Date(Date.now() + 7);
        await this.refreshTokenRepository.create(user.id, hashedRefreshToken, expiresAt);

        return {accessToken, refreshToken: plainRefreshToken, user}

    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
        
    }
}