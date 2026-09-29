import {container} from "../../container";
import {IEventBus} from "../eventBus.interface";
import {IUsageLogRepository} from "../../repositories/usageLogRepository.interface";
import {DOCUMENT_EVENTS} from "../types/document.events";


export async function registerDocumentSubscriber(): Promise<void> {

    const eventBus = container.resolve("IEventBus") as IEventBus;
    const usageLog = container.resolve("IUsageLogRepository") as IUsageLogRepository


    await eventBus.subscribe(DOCUMENT_EVENTS.DOCUMENT_UPLOADED, async ({userId, documentId}) => {
        await usageLog.createUsageLog({userId, action: "DOCUMENT_UPLOADED", metadata: {documentId}});
    })

    await eventBus.subscribe(DOCUMENT_EVENTS.DOCUMENT_PROCESSED, async ({userId, documentId, chunkCount, status}) => {
        await usageLog.createUsageLog({
            userId,
            action: "DOCUMENT_PROCESSED",
            tokens: chunkCount,
            metadata: {documentId, status}
        })
    })

    await eventBus.subscribe(DOCUMENT_EVENTS.DOCUMENT_DELETED, async ({userId, documentId}) => {
        await usageLog.createUsageLog({userId, action: "DOCUMENT_DELETED", metadata: {documentId}});
    })
}