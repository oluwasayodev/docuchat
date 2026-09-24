import {IBaseRepository} from "./baseRepository.interface";
import {PrismaClient, Role} from "@prisma/client";
import {inject, injectable} from "tsyringe";

export interface IRoleRepository extends IBaseRepository<Role, string> {
    findByName(name: string): Promise<Role | null>;
}

@injectable()
export class RoleRepository implements IRoleRepository {

    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async create(data: Partial<Role>): Promise<Role> {
        return await this.prisma.role.create({data: data as any})
    }

    async delete(id: string): Promise<boolean> {
        await this.prisma.role.delete({where: {id}});
        return true;
    }

    async findAll(): Promise<Role[]> {
        return Promise.resolve([]);
    }


    async findById(id: string): Promise<Role | null> {
        return this.prisma.role.findUnique({where: {id}});
    }

    async update(id: string, data: Partial<Role>): Promise<Role> {
        return this.prisma.role.update({
            where: {id},
            data
        });
    }

    async findByName(name: string): Promise<Role | null> {
        return this.prisma.role.findUnique({where: {name}});
    }




}