import 'reflect-metadata'
import {container} from "./container";
import {IWorker} from "./workers/worker.interface";
import {config} from "./lib/config";
import {QUEUES} from "./queues/queue.constants";
import {registerJobHandlers} from "./workers/handlers";
import {registerAuthSubscriber} from "./events/subscribers/auth.subscriber";
import {ILogger} from "./logging/logger.interface";


const bootstrap = async () => {

    const worker = container.resolve("IWorker") as IWorker;
    const logger = container.resolve("ILogger") as ILogger;

    registerJobHandlers(worker);

    if (config.eventBusDriver === "kafka") {
        await registerAuthSubscriber()
    }

    worker.start(Object.values(QUEUES).map(q => q.name))

    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}. Shutting down worker...`);
        await worker.stop();
        process.exit(0);
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}


bootstrap()
    .catch(err => {
        console.error("Failed to start worker...", err);
        process.exit(1);
    })