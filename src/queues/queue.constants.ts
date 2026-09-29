

export const QUEUE_NAMES = {
    EMAIL: "docuchat.email",
    DOCUMENTS: "docuchat.documents",
    DLQ: "docuchat.dlq",
} as const;


export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];


export interface QueueJobRef {
    queue: QueueName;
    name: string;
}

export type QueueJobRefMap<TJobs> = {
    readonly [K in keyof TJobs]: {queue: QueueName, name: TJobs[K]};
}

function defineQueue<QName extends QueueName>(name: QName) {
    return <const TJobs extends Record<string, string>>(jobs: TJobs) => {
       const jobRefs = {} as QueueJobRefMap<TJobs>;
       for (const [jobKey, jobName] of Object.entries(jobs)) {
           (jobRefs as Record<string, QueueJobRef>)[jobKey] = {queue: name, name: jobName};
       }
        return {name: name, jobs: jobRefs};
    }
}

export const QUEUES = {
    EMAIL: defineQueue(QUEUE_NAMES.EMAIL)({
        SEND_WELCOME_EMAIL: "send-welcome-email",
        SEND_PASSWORD_RESET_EMAIL: "send-password-reset-email"
    }),
    DOCUMENTS: defineQueue(QUEUE_NAMES.DOCUMENTS)({
        PROCESS_DOCUMENT: "process-document",
    }),
    DLQ: defineQueue(QUEUE_NAMES.DLQ)({
        RETRY_EXHAUSTED: "retry-exhausted"
    })

} as const;
