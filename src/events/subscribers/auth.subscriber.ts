import {container} from "../../container";
import {IEventBus} from "../eventBus.interface";
import {IJobQueue} from "../../queues/jobQueue.interface";
import {AUTH_EVENTS} from "../types/auth.events";
import {QUEUES} from "../../queues/queue.constants";


export async function registerAuthSubscriber(): Promise<void> {

    const eventBus = container.resolve("IEventBus") as IEventBus;
    const jobQueue = container.resolve("IJobQueue") as IJobQueue;


    await eventBus.subscribe(AUTH_EVENTS.USER_REGISTERED, async (payload) => {
        await jobQueue.addJob(QUEUES.EMAIL.jobs.SEND_WELCOME_EMAIL, {
            userId: payload.userId,
            email: payload.email
        })
    })
}