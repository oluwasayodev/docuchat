import {DependencyContainer, instanceCachingFactory} from "tsyringe";
import {IWorker} from "./worker.interface";
import {BullMQWorker} from "./bullMQWorker";
import {AppConfig} from "../lib/config";


export const workerFactory = instanceCachingFactory<IWorker>((c: DependencyContainer) => {
    const driver = c.resolve(AppConfig).workerDriver;
    switch (driver) {
        case "bullmq":
        default:
            return c.resolve(BullMQWorker);
    }
});