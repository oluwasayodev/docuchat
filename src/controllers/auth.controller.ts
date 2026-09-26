import {inject, injectable} from "tsyringe";
import {IAuthService} from "../services/authService.interface";
import {Request, Response} from "express";
import {AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest} from "../dtos/auth.dto";
import {Body, Controller, Middlewares, Post, Route, Security, SuccessResponse, Tags} from "tsoa";
import {Serialize} from "../middleware/serialize.middleware";
import {hasRole} from "../middleware/auth.middleware";
import {ROLES} from "../constants/roles";


@injectable()
@Route("auth")
@Tags("auth")
export class AuthController extends Controller{

    constructor(@inject("IAuthService") private authService: IAuthService) {
        super();
    }


    @Post("/register")
    @SuccessResponse("201", "Created")
    @Middlewares(Serialize(AuthResponse))
    async register(@Body() dto: RegisterRequest): Promise<AuthResponse> {
        const result = await this.authService.register(dto);
        return result as AuthResponse;

    }

    @Post("/login")
    @SuccessResponse("200", "OK")
    @Middlewares(Serialize(AuthResponse))
    async login(@Body() dto: LoginRequest): Promise<AuthResponse> {
        const result = await this.authService.login(dto);
        return result as AuthResponse;
    }

    @Post("/token/refresh")
    @SuccessResponse("200", "OK")
    @Middlewares(Serialize(AuthResponse))
    async refreshToken(@Body() dto: RefreshTokenRequest): Promise<AuthResponse> {
        const result = await this.authService.refreshToken(dto);
        return result as AuthResponse;

    }


    @Post("/logout")
    @SuccessResponse("204", "No Content")
    @Security("jwt")
    @Middlewares(hasRole(ROLES.USER, ROLES.ADMIN, ROLES.SUPER_ADMIN))
    async logout(@Body() dto: RefreshTokenRequest): Promise<void> {
        await this.authService.logout(dto.refreshToken);
    }

}