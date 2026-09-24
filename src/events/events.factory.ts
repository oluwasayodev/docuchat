import {DependencyContainer, instanceCachingFactory} from "tsyringe";
import {IEventBus} from "./eventBus.interface";
import {KafkaEventBus} from "./kafkaEventBus";
import {InMemoryEventBus} from "./inMemoryEventBus";
import {AppConfig} from "../lib/config";


export const eventBusFactory = instanceCachingFactory<IEventBus>((c: DependencyContainer) => {

    const driver = c.resolve(AppConfig).eventBusDriver;

    switch (driver) {
        case "kafka":
            return c.resolve(KafkaEventBus)
        case "in-memory":
        default:
            return c.resolve(InMemoryEventBus);

    }
})
