import {DependencyContainer, instanceCachingFactory} from "tsyringe";
import {IChunkStore} from "./chunkStore.interface";
import {AppConfig} from "../lib/config";
import {ElasticSearchChunkStore} from "./elasticsearchChunkStore";
import {PostgresChunkStore} from "./postgresChunkStore";


export const chunkStoreFactory = instanceCachingFactory<IChunkStore>((c: DependencyContainer) => {
    const driver = c.resolve(AppConfig).chunkStore;

    switch (driver) {
        case "elasticsearch":
            return c.resolve(ElasticSearchChunkStore)
        case "postgres":
        default:
            return c.resolve(PostgresChunkStore)
    }
})