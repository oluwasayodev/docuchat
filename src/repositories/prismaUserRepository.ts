import {CreateUserData, IUserRepository, UserWithRelations} from "./userRepository.interface";
import {inject, injectable} from "tsyringe";
import {User, PrismaClient, AuthProviderType} from "@prisma/client";



@injectable()
export class PrismaUserRepository implements IUserRepository {

    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    private readonly RELATIONAL_INCLUDE = {
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

    async create(data: Partial<User>): Promise<User> {
        return this.prisma.user.create({data: data as any});
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.user.delete({where: { id }});
        return true;
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }


    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {id, deletedAt: null},
        });
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        return this.prisma.user.update({
            where: {id:id},
            data: data as any,
        });
    }

    findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({where: {email}});
    }

    async createUserWithRelations(data: CreateUserData): Promise<UserWithRelations> {
        return this.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash: data.passwordHash,
                roles: { create: {roleId: data.roleId} },
                identities: {
                    create: {
                        provider: data.provider,
                        providerId: data.providerId,
                    }
                }
            },
            include: this.RELATIONAL_INCLUDE
        })
    }

    async findByEmailWithRelations(email: string): Promise<UserWithRelations | null> {
        return this.prisma.user.findUnique({where: {email}, include: this.RELATIONAL_INCLUDE});
    }

    async findByIdWithRelations(id: string): Promise<UserWithRelations | null> {
        return this.prisma.user.findUnique({where: {id}, include: this.RELATIONAL_INCLUDE});
    }

    async findByIdentity(provider: AuthProviderType, providerId: string): Promise<UserWithRelations | null> {
        const identity = await this.prisma.userIdentity.findUnique({
            where: {provider_providerId: {provider, providerId}},
            include: {
                user: {
                    include: this.RELATIONAL_INCLUDE
                }
            }
        })

        return identity?.user ?? null;
    }

    async linkIdentity(userId: string, providerId: string, provider: AuthProviderType): Promise<void> {
        await this.prisma.userIdentity.create({
            data: {userId, providerId, provider}
        })
    }

    async updatePassword(userId: string, passwordHash: string): Promise<void> {
        await this.prisma.user.update({
            where: {id: userId},
            data: { passwordHash },
        })
    }

    async updatePasswordAndLinkIdentity(userId: string, passwordHash: string, providerId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await this.prisma.user.update({
                where: {id: userId},
                data: { passwordHash },
            })

            const existingIdentity = await tx.userIdentity.findUnique({
                where: {provider_providerId: {provider: AuthProviderType.LOCAL, providerId}},
            })

            if (!existingIdentity) {
                await tx.userIdentity.create({
                    data: {
                        userId,
                        provider: AuthProviderType.LOCAL,
                        providerId: providerId,
                    }
                })
            }
        })
    }

}