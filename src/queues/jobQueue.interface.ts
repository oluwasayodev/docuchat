import {QueueJobRef, QueueName} from "./queue.constants";

export interface JobsOptions {
    jobId?: string;
    delay?: number;
    priority?: number;
    attempts?: number;
}

export interface QueuedJob {
    queueName: string;
    jobName: string;
    id?: string;
}


export interface IJobQueue {
    addJob(jobRef: QueueJobRef, payload: unknown, options?: JobsOptions): Promise<void>;
}