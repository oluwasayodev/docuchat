import {JwtPayload} from "jsonwebtoken";


export interface UserTokenPayload extends JwtPayload {
    id: string;
    email: string;
    role: string;
    permissions: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: UserTokenPayload;
        }
    }
}

export {}