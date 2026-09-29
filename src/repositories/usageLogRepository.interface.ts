import {UsageAction, UsageLog} from "../types/usage.types";
import {Page, PaginatedQuery} from "../types/pagination.type";


export type UsageLogSortField = "createdAt" | "action" | "tokens";

export interface CreateUsageLogData {
    userId: string;
    action: UsageAction;
    tokens?: number;
    costUsd?: number | null;
    metadata?: Record<string, unknown> | null;
}

export type ListUsageLogQuery = PaginatedQuery<UsageLogSortField> & {
    action?: UsageAction;
    from?: Date,
    to?: Date,
}

export interface IUsageLogRepository {
    createUsageLog(data: CreateUsageLogData): Promise<UsageLog>;
    listByUserId(userId: string, query: ListUsageLogQuery): Promise<Page<UsageLog>>;
}