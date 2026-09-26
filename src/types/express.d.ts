import {JwtPayload} from "jsonwebtoken";
import {RoleName} from "../constants/roles";
import {PermissionAction} from "../constants/permissions";


export interface UserTokenPayload extends JwtPayload {
    id: string;
    email: string;
    roles: RoleName[];
    permissions: PermissionAction [];
}

declare global {
    namespace Express {
        interface Request {
            user?: UserTokenPayload;
        }
    }
}

export {}