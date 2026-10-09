export const NO_EXPIRY = Symbol("NO_EXPIRY");

export type CacheTtl = number | typeof NO_EXPIRY;

export interface ICacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: CacheTtl): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: CacheTtl): Promise<T>;
}