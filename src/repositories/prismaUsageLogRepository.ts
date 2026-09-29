import {
    CreateUsageLogData,
    IUsageLogRepository,
    ListUsageLogQuery,
    UsageLogSortField
} from "./usageLogRepository.interface";
import {inject, injectable} from "tsyringe";
import {UsageAction, UsageLog} from "../types/usage.types";
import {Prisma, PrismaClient, UsageLog as PrismaUsageLog} from "@prisma/client";
import {buildPage, resolvePage} from "./pagination.util";
import {resolveSort} from "./sorting.util";
import {Page} from "../types/pagination.type";


const SORTABLE_FIELDS: readonly UsageLogSortField[] = ["createdAt", "action", "tokens"];

@injectable()
export class PrismaUsageLogRepository implements IUsageLogRepository {


    constructor(@inject(PrismaClient) private prisma: PrismaClient) {}

    async createUsageLog(data: CreateUsageLogData): Promise<UsageLog> {
        const row = await this.prisma.usageLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                tokens: data.tokens ?? 0,
                costUsd: data.costUsd ?? null,
                metadata: data.metadata ? data.metadata as Prisma.InputJsonValue : undefined,
            }
        })

        return this.toUsageLog(row);
    }

    async listByUserId(userId: string, query: ListUsageLogQuery): Promise<Page<UsageLog>> {
        const resolved = resolvePage(query);
        const {orderBy, sort} = resolveSort(SORTABLE_FIELDS, "createdAt", "desc", query);

        const where: Prisma.UsageLogWhereInput = {
            userId,
            ...(query.action ? {action: query.action} : {}),
            ...(query.from || query.to ? {
                createdAt: {
                    ...(query.from ? {gte: query.from} : {}),
                    ...(query.to ? {lte: query.to} : {}),
                }
            } : {}),
        };

        const [rows, total] = await Promise.all([
            this.prisma.usageLog.findMany({
                where,
                orderBy,
                skip: resolved.skip,
                take: resolved.take
            }),
            this.prisma.usageLog.count({where})
        ])

        return buildPage(rows.map(row => this.toUsageLog(row)), total, resolved, sort);
    }


    private toUsageLog(row: PrismaUsageLog): UsageLog {

        return {
            id: row.id,
            userId: row.userId,
            action: row.action as UsageAction,
            tokens: row.tokens,
            costUsd: row.costUsd === null ? null : row.costUsd.toNumber(),
            metadata: (row.metadata as Record<string, unknown> | null) ?? null,
            createdAt: row.createdAt
        }

    }
}