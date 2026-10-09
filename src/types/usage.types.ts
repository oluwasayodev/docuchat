export const USAGE_ACTIONS = [
    "DOCUMENT_UPLOADED",
    "DOCUMENT_PROCESSED",
    "DOCUMENT_DELETED",
    "EMBEDDING",
    "DOCUMENT_SEARCH",
    "CHAT_COMPLETION"
] as const;

export type UsageAction = (typeof USAGE_ACTIONS)[number];


export interface UsageLog {
    id: string;
    userId: string;
    action: UsageAction;
    tokens: number;
    costUsd: number | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
}