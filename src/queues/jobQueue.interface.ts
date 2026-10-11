import {QueueName, QUEUES} from "./queue.constants";

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

export interface JobPayloadMap {
    "send-welcome-email": {userId: string; email: string};
    "send-password-reset-email": {to: string; name: string; resetLink: string};
    "process-document": {documentId: string, correlationId?: string};
    "retry-exhausted": {
        originalQueue: string;
        originalJobName: string;
        originalJobId: string | undefined;
        payload: unknown;
        error: string;
    }
}



export type JobRef<K extends keyof JobPayloadMap & string> = {
    queue: QueueName,
    name: K
}



export interface IJobQueue {
    addJob<K extends keyof JobPayloadMap & string>(
        jobRef: JobRef<K>,
        payload: JobPayloadMap[K],
        options?: JobsOptions
    ): Promise<void>;
}