import {IBaseRepository} from "./baseRepository.interface";
import { User } from "@prisma/client";


export interface IUserRepository extends IBaseRepository<User, string> {

    findByEmail(email: string): Promise<User | null>;

}