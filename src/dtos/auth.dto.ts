import {IsEmail, IsNotEmpty, IsOptional, IsString, MinLength} from "class-validator";
import {Exclude, Expose, Type} from "class-transformer";
import {UserResponse} from "./user.dto";
import {AuthProviderType} from "@prisma/client";


export class RegisterRequest {

    @IsEmail()
    email!: string;

    @IsString()
    name!: string;

    @MinLength(6, { message: "Password must be at least 6 characters long"})
    password!: string;

    @IsString()
    @IsOptional()
    roleId?: string;
}

export class LoginRequest {
    @IsEmail()
    email!: string;

    @IsString()
    password!: string;
}

@Exclude()
export class AuthResponse {

    @Expose() accessToken!: string;
    @Expose() refreshToken!: string;

    @Expose()
    @Type(() => UserResponse)
    user!: UserResponse;

}

export class RefreshTokenRequest {
    @IsString()
    @IsNotEmpty()
    refreshToken!: string;
}

export class AuthTokenResponse {
    accessToken!: string;
    refreshToken!: string;
    user!: UserResponse;
}

export class SocialLoginRequest {
    provider!: AuthProviderType;
    idToken!: string;
}

export class SetPasswordRequest {
    newPassword!: string;
}

export class ResetPasswordRequest {
    token!: string;
    newPassword!: string;
}

export class RequestResetPasswordRequest {
    email!: string;
}

