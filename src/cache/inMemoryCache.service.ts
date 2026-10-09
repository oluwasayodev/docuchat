import {CacheTtl, ICacheService, NO_EXPIRY} from "./cacheService.interface";
import {singleton} from "tsyringe";


@singleton()
export class InMemoryCacheService implements ICacheService {

    private store = new Map<string, {value: string, expiresAt?: number}>();
    private locks = new Set<string>();



    async del(key: string): Promise<void> {
        this.store.delete(key);
    }

    async exists(key: string): Promise<boolean> {
        return (await this.get(key)) !== null;
    }

    async get<T>(key: string): Promise<T | null> {
        const item = this.store.get(key);
        if (!item) return null;

        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.store.delete(key);
            return null;
        }

        return JSON.parse(item.value) as T;
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: CacheTtl): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null && cached !== undefined) return cached;

        const lockKey = `${key}:lock`;

        if (!this.locks.has(lockKey)) {
            this.locks.add(lockKey);
            try {
                const fresh = await factory();
                if (fresh !== null && fresh !== undefined) await this.set(key, fresh, ttlSeconds);
                return fresh;
            } finally {
                this.locks.delete(lockKey);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        const waited = await this.get<T>(key);
        return waited !== null && waited !== undefined ? waited : factory();
    }

    async set<T>(key: string, value: T, ttlSeconds: CacheTtl): Promise<void> {
        const expiresAt = ttlSeconds === NO_EXPIRY ? undefined : Date.now() + ttlSeconds * 1000 ;
        this.store.set(key, {value: JSON.stringify(value), expiresAt});
    }

}