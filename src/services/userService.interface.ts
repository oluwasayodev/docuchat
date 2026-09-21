import {User} from "@prisma/client";
import {UserResponse} from "../dtos/user.dto";

export interface IUserService {
    getUserProfile(id: string): Promise<User>;
    registerUser(dto: UserResponse): Promise<User>;
}