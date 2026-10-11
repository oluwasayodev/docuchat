import {IWorker, WorkContext} from "./worker.interface";
import {Job, Worker} from 'bullmq'
import {inject, injectable} from "tsyringe";
import {ILogger} from "../logging/logger.interface";
import {AppConfig} from "../lib/config";
import {IJobQueue} from "../queues/jobQueue.interface";
import {QueueJobRef, QueueName, QUEUES} from "../queues/queue.constants";
import {clearInterval} from "node:timers";
import {runWithLogContext} from "../logging/logContext";


@injectable()
export class BullMQWorker implements IWorker {

    private readonly handlers = new Map<string, (ctx: WorkContext) => Promise<void> | void>();
    private readonly workers: Worker[] = [];
    private readonly progressAt = new Map<string, number>();
    private readonly warnedStalls = new Set<string>();
    private stallTimer?: NodeJS.Timeout;

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
                concurrency: this.config.queueConcurrency,
                lockDuration: this.config.queueLockDurationMs,
                maxStalledCount: this.config.queueMaxStallCount
            })

            worker.on("completed", job => {
                this.clearJob(job.id);
                this.logger.info(`Job ${job.id} (${job.name}) completed on '${queueName}'`);
            });

            worker.on("failed", (job, error) => {
                this.clearJob(job?.id);
                return this.onFailed(queueName, job, error);
            })

            worker.on("stalled", (jobId: string) => {
                this.logger.warn("Job stalled (lock expired)", {jobId, queueName});
            })

            this.workers.push(worker);
        }

        this.startStallWatchdog();
    }

    async stop(): Promise<void> {
        if (this.stallTimer) {
            clearInterval(this.stallTimer);
            this.stallTimer = undefined;
        }
        await Promise.all(this.workers.map(w => w.close()));
        this.logger.info("All workers closed")
    }

    private async process(job: Job): Promise<void> {
        const handler = this.handlers.get(`${job.queueName}:${job.name}`);
        if(!handler) {
            this.logger.warn(`No handler registered for '${job.queueName}:${job.name}'`);
            return;
        }

        const correlationId = (job?.data.correlationId as string | undefined) ?? job.id ?? "unknown";
        const jobLogger = this.logger.child({
            correlationId: correlationId,
            jobId: job.id,
            queue: job.queueName,
            jobName: job.name,
        })

        this.progressAt.set(job.id!, Date.now());

        const ctx: WorkContext = {
            jobId: job.id!,
            queueName: job.queueName,
            jobName: job.name,
            payload: job.data,
            attemptsMade: job.attemptsMade,
            updateProgress: async (value: number) => {
                this.progressAt.set(job.id!, Date.now());
                await job.updateProgress(value).catch(() => undefined);
            },
            log: async (message: string) => {
                await job.log(message).catch(() => undefined);
            }
        }

        jobLogger.info(`Processing '${ctx.queueName}:${ctx.jobName}' (id: ${ctx.jobId})`);
        await runWithLogContext({correlationId, logger: jobLogger}, () => handler(ctx))
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

    private clearJob(jobId: string | undefined) {
        if (!jobId) return;
        this.progressAt.delete(jobId);
        this.warnedStalls.delete(jobId);
    }

    private startStallWatchdog(): void {
        if (this.stallTimer) return;
        this.stallTimer = setInterval(() => this.checkForStalls(), this.config.stallCheckIntervalMs);
        this.stallTimer.unref();

    }

    private checkForStalls(): void {

        const now = Date.now();
        for (const [jobId, lastProgressAt] of this.progressAt) {
            if (now - lastProgressAt <= this.config.ingestStallThresholdMs) continue;
            if (this.warnedStalls.has(jobId)) continue;
            this.warnedStalls.add(jobId);
            this.logger.warn("Job has made no progress within threshold", {
                jobId: jobId,
                idleMs: now - lastProgressAt,
                thresholdMs: this.config.ingestStallThresholdMs
            })
        }

    }
}