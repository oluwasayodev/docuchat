import {DependencyContainer, instanceCachingFactory} from "tsyringe";
import {ICacheService} from "./cacheService.interface";
import {RedisCacheService} from "./redisCache.service";
import {InMemoryCacheService} from "./inMemoryCache.service";
import {AppConfig} from "../lib/config";

export const cacheFactory = instanceCachingFactory<ICacheService>((c: DependencyContainer) => {

    const driver = c.resolve(AppConfig).cacheDriver;

    switch (driver) {
        case "redis":
            return c.resolve(RedisCacheService);
        case "in-memory":
        default:
            return c.resolve(InMemoryCacheService);
    }
})
