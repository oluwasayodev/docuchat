import {CacheTtl, ICacheService, NO_EXPIRY} from "./cacheService.interface";
import Redis from "ioredis";
import {inject, singleton} from "tsyringe";
import {AppConfig} from "../lib/config";

@singleton()
export class RedisCacheService implements ICacheService {

    private redis: Redis;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {
        this.redis = new Redis(
            this.appConfig.redisUrl || 'redis://127.0.0.1:6379',
            {
                keyPrefix: "docuchat:"
            }
        );
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async exists(key: string): Promise<boolean> {
        return (await this.redis.exists(key)) > 0;
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) as T : null;
    }

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: CacheTtl): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null && cached !== undefined) return cached;

        const lockKey = `${key}:lock`;
        const acquired = await this.redis.set(lockKey, "1", "EX", 5, "NX");

        if (!acquired) {
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 100));
                const waited = await this.get<T>(key);
                if (waited !== null && waited !== undefined) return waited;
            }
            return factory();
        }

        try {
            const fresh = await factory();
            if (fresh !== null && fresh !== undefined) await this.set(key, fresh, ttlSeconds);
            return fresh;
        } finally {
            await this.redis.del(lockKey);
        }

    }

    async set<T>(key: string, value: T, ttlSeconds: CacheTtl): Promise<void> {
        const data = JSON.stringify(value);

        if (ttlSeconds === NO_EXPIRY) {
            await this.redis.set(key, data);
            return ;
        }

        if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
            throw new RangeError(`Cache TTL must be a positive number of seconds or NO_EXPIRY (KEY: ${key})`)
        }

       await this.redis.set(key, data, "EX", Math.ceil(ttlSeconds));
    }


}