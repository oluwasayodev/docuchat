import {IWorker} from "./worker.interface";
import {container} from "../container";
import {ILogger} from "../logging/logger.interface";
import {QUEUES} from "../queues/queue.constants";
import {IDocumentProcessingService} from "../services/documentProcessingService.interface";


export function registerJobHandlers(worker: IWorker): IWorker {

    const logger = container.resolve("ILogger") as ILogger;

    worker
        .register(QUEUES.EMAIL.jobs.SEND_WELCOME_EMAIL, async (ctx) => {
            logger.info("Sending welcome email...", {payload: ctx.payload});
        })
        .register(QUEUES.EMAIL.jobs.SEND_PASSWORD_RESET_EMAIL, async (ctx) => {
            logger.info("Sending password reset email...", {payload: ctx.payload});
        })
        .register(QUEUES.DOCUMENTS.jobs.PROCESS_DOCUMENT, async (ctx) => {
            const processing = container.resolve("IDocumentProcessingService") as IDocumentProcessingService;
            const { documentId } = ctx.payload as {documentId: string};
            await processing.process(documentId, ctx.updateProgress, ctx.log);
        })

    return worker;
}