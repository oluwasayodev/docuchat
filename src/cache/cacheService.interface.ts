

export interface ICacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: any, ttlSeconds: number | undefined): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}