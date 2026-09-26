import 'reflect-metadata'
import app from "./app";
import {config} from "./lib/config";
import {container} from "./container";
import {BullMQJobQueue} from "./queues/bullMQJobQueue";
import {registerQueue} from "./queues/bullBoard.setup";
import {QUEUE_JOBS, QUEUE_NAMES, QUEUES} from "./queues/queue.constants";
import {ILogger} from "./logging/logger.interface";
import {IWorker} from "./workers/worker.interface";
import {registerAuthSubscriber} from "./events/subscribers/auth.subscriber";




const bootstrap = async () => {
    const jobQueue = container.resolve("IJobQueue") as BullMQJobQueue;
    for (const queue of Object.values(QUEUES)) {
        registerQueue(jobQueue.getQueue(queue.name));
    }


    const logger = container.resolve("ILogger") as ILogger;
    const worker = container.resolve("IWorker") as IWorker;

    logger.info("[Server] Bull board registered for all queues")

    if (config.eventBusDriver == "in-memory") {
        await registerAuthSubscriber();
    }


    const server = app.listen(config.port, () => {
        console.log("Server listening on port: ", config.port);
    })

    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}. Shutting down gracefully...`);
        await worker.stop();

        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10_000).unref();
    }


    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}


bootstrap()
    .catch((err) => {
        console.error("Failed to start server", err);
        process.exit(1);
    })




