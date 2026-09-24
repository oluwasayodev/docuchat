import {NextFunction, Request, Response} from "express";
import {ForbiddenException, UnauthorizedException} from "../errors/http.error";
import jwt from "jsonwebtoken";
import {config} from "../lib/config";
import {UserTokenPayload} from "../types/express";
import {PermissionAction} from "../constants/permissions";


export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedException("Token is required");
    }

    try {
        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, config.jwtSecret) as UserTokenPayload;
        next();
    } catch (error) {
        throw new UnauthorizedException("Invalid or expired token");
    }
}

export const hasRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new ForbiddenException("Access denied");
        }
        next();
    }
}


export const hasPermission = (...required: PermissionAction[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) throw new UnauthorizedException("Access denied");
        if (req.user.role === "SUPER_ADMIN") return next();

        const userPermissions = new Set(req.user.permissions);
        if (!required.every(permission => userPermissions.has(permission))) {
            throw new ForbiddenException("Access denied: missing permission");
        }
    }
}