

export const QUEUE_NAMES = {
    EMAIL: "docuchat.email",
    DOCUMENTS: "docuchat.documents",
    DLQ: "docuchat.dlq",
} as const;


export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type QueueKey = keyof typeof QUEUE_NAMES;

export interface QueueJobRef {
    queue: QueueName;
    name: string;
}

function defineQueue<QName extends QueueName>(name: QName) {
    return <TJobs extends Record<string, string>>(jobs: TJobs) => {
        const jobRefs = Object.entries(jobs).reduce((acc, [jobKey, jobName]) => {
            acc[jobKey] = {queue: name, name: jobName}
            return acc;
        }, {} as Record<string, QueueJobRef>) as {[K in keyof TJobs]: QueueJobRef};
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

export const QUEUE_JOBS = {
    [QUEUE_NAMES.EMAIL]: {
        SEND_WELCOME_EMAIL: "send-welcome-email",
        SEND_PASSWORD_RESET_EMAIL: "send-password-reset-email",
    },
    [QUEUE_NAMES.DOCUMENTS]: {
        PROCESS_DOCUMENT: "process-document",
    },
    [QUEUE_NAMES.DLQ]: {
        RETRY_EXHAUSTED: "retry-exhausted",
    }
} as const;