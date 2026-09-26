import {UserTokenPayload} from "./types/express";
import {UnauthorizedException} from "./errors/http.error";
import {Request, Response} from 'express'
import jwt from "jsonwebtoken";
import {config} from "./lib/config";


export async function expressAuthentication(
    request: Request,
    securityName: string
): Promise<UserTokenPayload> {

    if (securityName!== 'jwt') {
        throw new UnauthorizedException("Unknown security scheme");
    }

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedException("Token is required");
    }

    try {
        const token = authHeader.split(" ")[1];
        return jwt.verify(token, config.jwtSecret) as UserTokenPayload;
    } catch {
        throw new UnauthorizedException("Invalid or expired token");
    }
}