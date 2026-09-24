import {User} from "@prisma/client";
import {LoginRequest, RefreshTokenRequest, RegisterRequest, SocialLoginRequest} from "../dtos/auth.dto";


export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    user: User
}


export interface IAuthService {
    register(dto: RegisterRequest | null): Promise<AuthTokens>;
    login(dto: LoginRequest): Promise<AuthTokens>;
    refreshToken(dto: RefreshTokenRequest): Promise<AuthTokens>;
    logout(refreshToken: string): Promise<void>;
    socialLogin(dto: SocialLoginRequest): Promise<AuthTokens>;
}