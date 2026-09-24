import {ICacheService} from "./cacheService.interface";
import Redis from "ioredis";
import {inject, singleton} from "tsyringe";
import {AppConfig} from "../lib/config";

@singleton()
export class RedisCacheService implements ICacheService {

    private redis: Redis;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {
        this.redis = new Redis(this.appConfig.redisUrl || 'redis://127.0.0.1:6379');
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

    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached) return cached;

        const freshData = await factory();
        if (freshData !== null && freshData !== undefined) {
            await this.set(key, freshData, ttlSeconds);
        };

        return freshData;

    }

    async set<T>(key: string, value: any, ttlSeconds: number | undefined): Promise<void> {
        const data = JSON.stringify(value);
        if (ttlSeconds) {
            await this.redis.set(key, data, 'EX', ttlSeconds);
        } else {
            await this.redis.set(key, data);
        }
    }


}