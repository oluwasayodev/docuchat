import {IUserRepository} from "./userRepository.interface";
import {inject, injectable} from "tsyringe";
import {User, PrismaClient} from "@prisma/client";



@injectable()
export class PrismaUserRepository implements IUserRepository {

    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async create(data: Partial<User>): Promise<User> {
        return this.prisma.user.create({
            data: data as any,
            include: {role: {include: {permissions: true}}}
        });
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.user.delete({where: {id: id}});
        return true;
    }

    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {email: email},
            include: {role: {include: {permissions: true}}}
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: {id: id},
            include: {role: {include: {permissions: true}}}
        });
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        return this.prisma.user.update({
            where: {id:id},
            data: data as any,
            include: {role: {include: {permissions: true}}}
        });
    }

}