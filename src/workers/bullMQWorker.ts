import {IWorker, WorkContext} from "./worker.interface";
import {Job, Worker} from 'bullmq'
import {inject, injectable} from "tsyringe";
import {ILogger} from "../logging/logger.interface";
import {AppConfig} from "../lib/config";
import {IJobQueue} from "../queues/jobQueue.interface";
import {QueueJobRef, QueueName, QUEUES} from "../queues/queue.constants";


@injectable()
export class BullMQWorker implements IWorker {

    private readonly handlers = new Map<string, (ctx: WorkContext) => Promise<void> | void>();
    private readonly workers: Worker[] = [];

    constructor(
        @inject("ILogger") private readonly logger: ILogger,
        @inject(AppConfig) private config: AppConfig,
        @inject("IJobQueue") private jobQueue: IJobQueue
    ) {}

    register(jobRef:QueueJobRef, handler: (ctx: WorkContext) => (Promise<void> | void)): this {
        this.handlers.set(`${jobRef.queue}:${jobRef.name}`, handler);
        return this;
    }

    start(queueNames: QueueName[]): void {
        for (const queueName of queueNames) {
            const worker = new Worker(queueName, job => this.process(job), {
                connection: {url: this.config.queueUrl},
                concurrency: this.config.queueConcurrency
            })

            worker.on("completed", job => {
                this.logger.info(`Job ${job.id} (${job.name}) completed on '${queueName}'`)
            });

            worker.on("failed", (job, error) => this.onFailed(queueName, job, error))

            this.workers.push(worker);
        }
    }

    async stop(): Promise<void> {
        await Promise.all(this.workers.map(w => w.close()));
        this.logger.info("All workers closed")
    }

    private async process(job: Job): Promise<void> {
        const handler = this.handlers.get(`${job.queueName}:${job.name}`);
        if(!handler) {
            this.logger.warn(`No handler registered for '${job.queueName}:${job.name}'`);
            return;
        }

        const ctx: WorkContext = {
            jobId: job.id!,
            queueName: job.queueName,
            jobName: job.name,
            payload: job.data,
            attemptsMade: job.attemptsMade
        }

        this.logger.info(`Processing '${ctx.queueName}:${ctx.jobName}' (id: ${ctx.jobId})`);
        await handler(ctx);
    }

    private async onFailed(queueName: string, job: Job | undefined, err: Error): Promise<void> {
        if (!job) return;

        if (job.attemptsMade < (job.opts.attempts ?? 1)) {
            this.logger.warn(`Job ${job.id} failed on '${queueName}' (attempt ${job.attemptsMade}): ${err.message}`);
            return;
        }

        this.logger.error(`Job ${job.id} (${job.name}) exhausted retries on '${queueName}': ${err.message}`)
        await this.jobQueue.addJob(QUEUES.DLQ.jobs.RETRY_EXHAUSTED, {
            originalQueue: queueName,
            originalJobName: job.name,
            originalJobId: job.id,
            payload: job.data,
            error: err.message
        })
    }
}