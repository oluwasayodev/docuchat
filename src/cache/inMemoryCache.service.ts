import {ICacheService} from "./cacheService.interface";
import {singleton} from "tsyringe";


@singleton()
export class InMemoryCacheService implements ICacheService {

    private store = new Map<string, {value: string, expiresAt?: number}>();



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

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        const fresh = await factory();
        if (fresh) await this.set(key, fresh, ttlSeconds);

        return fresh;
    }

    async set<T>(key: string, value: any, ttlSeconds: number | undefined): Promise<void> {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
        this.store.set(key, {value: JSON.stringify(value), expiresAt});
    }

}