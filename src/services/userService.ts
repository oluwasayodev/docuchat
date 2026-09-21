import {IUserService} from "./userService.interface";
import {inject, injectable} from "tsyringe";
import {IUserRepository} from "../repositories/userRepository.interface";
import {User} from "@prisma/client";
import {UserResponse} from "../dtos/user.dto";
import {BadRequestException, NotFoundError} from "../errors/http.error";


@injectable()
export class UserService implements IUserService {
    constructor(@inject("IUserRepository") private userRepository: IUserRepository ) {}

    async getUserProfile(id: string): Promise<User> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundError(`User with id ${id} not found`);
        }
        return user;
    }

    async registerUser(dto: UserResponse): Promise<User> {
        const existingUser = await this.userRepository.create(dto);
        if (existingUser) {
            throw new BadRequestException(`User with id ${existingUser.id} already exists`);
        }
        return this.userRepository.create(dto);
    }


}