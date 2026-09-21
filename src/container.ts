import {container} from "tsyringe";
import {PrismaClient} from "@prisma/client";
import {PrismaUserRepository} from "./repositories/prismaUserRepository";
import {UserService} from "./services/userService";
import {prisma} from "./lib/prisma";
import {PrismaRefreshTokenRepository} from "./repositories/prismaRefreshTokenRepository";
import {AuthService} from "./services/auth.service";



container.registerInstance(PrismaClient, prisma)
container.register("IUserRepository", {useClass: PrismaUserRepository});
container.register("IRefreshTokenRepository", {useClass: PrismaRefreshTokenRepository});
container.register("IUserService", {useClass: UserService});
container.register("IAuthService", {useClass: AuthService});

export {container};