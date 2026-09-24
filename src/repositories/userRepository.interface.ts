import {IBaseRepository} from "./baseRepository.interface";
import {AuthProviderType, Prisma, User} from "@prisma/client";


export type UserWithRelations = Prisma.UserGetPayload<{
    include: {
        roles: {
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        },
        identities: true
    }
}>

export interface CreateUserData {
    name: string
    email: string
    passwordHash?: string
    roleId: string
    providerId: string
    provider: AuthProviderType
}

export interface IUserRepository extends IBaseRepository<User, string> {

    findByEmail(email: string): Promise<User | null>;

    findByEmailWithRelations(email: string): Promise<UserWithRelations | null>;

    findByIdWithRelations(id: string): Promise<UserWithRelations | null>;

    findByIdentity(provider: AuthProviderType, providerId: string): Promise<UserWithRelations | null>;

    createUserWithRelations(data: CreateUserData): Promise<UserWithRelations>;

    linkIdentity(userId: string, providerId: string, provider: AuthProviderType): Promise<void>;

    updatePasswordAndLinkIdentity(userId: string, passwordHash: string, providerId: string): Promise<void>;

    updatePassword(userId: string, passwordHash: string): Promise<void>;

}