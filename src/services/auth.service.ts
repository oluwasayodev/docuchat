import {AuthTokens, IAuthService} from "./authService.interface";
import {LoginRequest, RefreshTokenRequest, RegisterRequest, SocialLoginRequest} from "../dtos/auth.dto";
import {inject, injectable} from "tsyringe";
import bcrypt from "bcryptjs";
import {IUserRepository, UserWithRelations} from "../repositories/userRepository.interface";
import {IRefreshTokenRepository} from "../repositories/refreshTokenRepository.interface";
import {ConflictException, InternalServerError, UnauthorizedException} from "../errors/http.error";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {AppConfig} from "../lib/config";
import {AuthProviderType, PrismaClient} from "@prisma/client";
import {IAuthProviderFactory} from "../providers/auth/authProvider.factory";
import {IEventBus} from "../events/eventBus.interface";
import {ICacheService} from "../cache/cacheService.interface";
import {ILogger} from "../logging/logger.interface";
import {IRoleRepository} from "../repositories/roleRepository";




@injectable()
export class AuthService implements IAuthService {


    constructor(
        @inject("IUserRepository") private userRepository: IUserRepository,
        @inject("IRoleRepository") private roleRepository: IRoleRepository,
        @inject("IRefreshTokenRepository") private refreshTokenRepository: IRefreshTokenRepository,
        @inject("IAuthProviderFactory") private authProviderFactory: IAuthProviderFactory,
        @inject("ILogger") private logger: ILogger,
        @inject("IEventBus") private eventBus: IEventBus,
        @inject("ICacheService") private cache: ICacheService,
        @inject(AppConfig) private appConfig: AppConfig,
    ) {}



    async login(dto: LoginRequest): Promise<AuthTokens> {
        this.logger.info("Attempting local password login: ", {email: dto.email});
        const user = await this.userRepository.findByEmailWithRelations(dto.email);
        if (!user || !await bcrypt.compare(dto.password, user.passwordHash!)) {
            this.logger.warn("Authentication failed: Invalid credentials or inactive account: ", {email: dto.email});
            throw new UnauthorizedException("Invalid Credentials");
        }
        this.logger.info("User logged in successfully: ", {userId: user.id});

        await this.cache.set(`user:session:${user.id}`, JSON.stringify({roles: user.roles}), 3600);
        await this.eventBus.publish("auth:user-login", {userId: user.id });
        return this.generateTokenPair(user);
    }

    async logout(refreshToken: string): Promise<void> {
        const hashedToken = this.hashToken(refreshToken);
        await this.refreshTokenRepository.deleteByToken(hashedToken);
        this.logger.info("User logged out successfully");
    }

    async refreshToken(dto: RefreshTokenRequest): Promise<AuthTokens> {
        const hashedToken = this.hashToken(dto.refreshToken);
        const storedToken = await this.refreshTokenRepository.findByToken(hashedToken);


        if (!storedToken || storedToken.deletedAt) {
            this.logger.warn("Refresh token failure: Invalid or revoked token from refresh token");
            throw new UnauthorizedException("Invalid or revoked refresh token");
        }

        if (storedToken.expiresAt < new Date()) {
            this.logger.warn("Refresh token failure: token expired", {userId: storedToken.userId});
            await this.refreshTokenRepository.deleteByToken(hashedToken);
            throw new UnauthorizedException("Refresh token expired");
        }

        const user = await this.userRepository.findByIdWithRelations(storedToken.userId);
        if (!user) {
            this.logger.warn("Refresh token failure: Account inactive or deleted", {userId: storedToken.userId});
            throw new UnauthorizedException("Invalid or revoked user");
        }
        await this.refreshTokenRepository.deleteByToken(hashedToken);
        return this.generateTokenPair(user);
    }

    async register(dto: RegisterRequest): Promise<AuthTokens> {
        this.logger.info("Attempting user registration", {email: dto.email});
        const existing = await this.userRepository.findByEmail(dto.email);
        if (existing) {
            this.logger.warn("Registration failed: Email already exists", {email: dto.email});
            throw new ConflictException("Email already exists");
        }

        const passwordHash = await bcrypt.hash(dto.password, this.appConfig.bcryptSaltRounds);

        let roleId = dto.roleId;

        if (!dto.roleId){
            const defaultRole = await this.roleRepository.findByName("USER");

            if (!defaultRole) {
                this.logger.error("System roles not initialized. Failed to resolve default role");
                throw new InternalServerError("System roles not initialized");
            }

            roleId = defaultRole.id;


        }

        const user = await this.userRepository.createUserWithRelations({
            email: dto.email,
            name: dto.name,
            passwordHash,
            roleId: roleId!,
            provider: AuthProviderType.LOCAL,
            providerId: dto.email
        });

        this.logger.info("User registered successfully", {userId: user.id});
        await this.eventBus.publish("auth:user-registered", {
            userId: user.id,
            email: user.email,
        });
        
        return this.generateTokenPair(user);


    }

    async socialLogin(dto: SocialLoginRequest): Promise<AuthTokens> {
        this.logger.info("Attempting social login", {provider: dto.provider});

        const provider = this.authProviderFactory.getProvider(dto.provider);
        const {providerId, email, name } = await provider.verifyToken(dto.idToken);

        let user = await this.userRepository.findByIdentity(dto.provider, providerId);

        if (!user) {
            let existingUser = await this.userRepository.findByEmailWithRelations(email);
            if (existingUser) {
                this.logger.info("Linking new social provider to existing user ", {userId: existingUser.id, provider: dto.provider});
                await this.userRepository.linkIdentity(existingUser.id, providerId, dto.provider);
                user = existingUser;
            } else {
                this.logger.info("Creating new user via social provisioning ", {email, provider: dto.provider});
                const defaultRole = await this.roleRepository.findByName("USER");
                if (!defaultRole) throw new InternalServerError("System roles not initialized. Failed to resolve default role");

                user = await this.userRepository.createUserWithRelations({
                    name,
                    email,
                    roleId: defaultRole.id,
                    provider: dto.provider,
                    providerId
                })

                await this.eventBus.publish("auth:user-registered", {userId: user.id, email: user.email});


            }
        }

        if (!user.isActive) {
            this.logger.warn("Social login blocked: User account is inactive", {userId: user.id, provider: dto.provider});
            throw new UnauthorizedException("User account is inactive")
        }

        await this.eventBus.publish("auth:user-login", {userId: user.id})
        return this.generateTokenPair(user);
    }


    private async generateTokenPair(user: UserWithRelations): Promise<AuthTokens> {

        const roles = user.roles.map((userRole) => userRole.role.name);
        const permissions = Array.from(
            new Set(user.roles.flatMap(userRole => userRole.role.permissions.map(rolePermission => `${rolePermission.permission.resource}:${rolePermission.permission.action}`)))
        )

        const accessPayload = { id: user.id,  email: user.email, roles, permissions }

        const accessToken = jwt.sign(
            accessPayload,
            this.appConfig.jwtSecret,
            {expiresIn: this.appConfig.jwtExpiresIn as jwt.SignOptions["expiresIn"]}
        )

        const plainRefreshToken = crypto.randomBytes(40).toString('hex')
        const hashedRefreshToken = this.hashToken(plainRefreshToken);

        const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.refreshTokenRepository.create(user.id, hashedRefreshToken, expiresAt);

        return {accessToken, refreshToken: plainRefreshToken, user}

    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
        
    }
}