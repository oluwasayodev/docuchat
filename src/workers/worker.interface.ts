import {QueueJobRef, QueueName} from "../queues/queue.constants";


export interface WorkContext {
    jobId: string;
    queueName: string;
    jobName: string;
    payload: unknown;
    attemptsMade: number;
    updateProgress: (value: number) => Promise<void>;
    log: (message: string) => Promise<void>;
}

export interface IWorker {
    register(jobRef: QueueJobRef, handler: (ctx: WorkContext) => Promise<void> | void): this;
    start(queueNames: QueueName[]): void;
    stop(): Promise<void>;
}