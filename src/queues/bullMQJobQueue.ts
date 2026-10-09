import {IJobQueue, JobPayloadMap, JobRef, JobsOptions} from "./jobQueue.interface";
import {QueueName} from "./queue.constants";
import {Queue} from "bullmq";
import {inject, injectable} from "tsyringe";
import {ILogger} from "../logging/logger.interface";
import {AppConfig} from "../lib/config";


@injectable()
export class BullMQJobQueue implements IJobQueue {

    private readonly queues = new Map<QueueName, Queue>();

    constructor(
        @inject("ILogger") private readonly logger: ILogger,
        @inject(AppConfig) private readonly appConfig: AppConfig
    ) {
        this.logger.info("[BullmqJobQueue]: Job Queue initialized");
    }

    getQueue(queueName: QueueName): Queue {
        let queue = this.queues.get(queueName);
        if (!queue) {
            queue = new Queue(queueName, {
                connection: {url: this.appConfig.queueUrl},
                defaultJobOptions: {
                    attempts: this.appConfig.queueAttempts,
                    backoff: {type: "exponential", delay: 1000},
                    removeOnComplete: {age: 86400, count: 1000},
                    removeOnFail: false,
                }
            });
            this.queues.set(queueName, queue);
            this.logger.info(`Queue '${queueName}' created`)
        }

        return queue;
    }

    listQueues(): Queue[] {
        return [...this.queues.values()]
    }

    async addJob<K extends keyof JobPayloadMap & string>(jobRef: JobRef<K>, payload: JobPayloadMap[K], options?: JobsOptions): Promise<void> {
        await this.getQueue(jobRef.queue).add(jobRef.name, payload, this.toBullMQOptions(options));
        this.logger.debug(`Job '${jobRef.name}' added to queue ${jobRef.queue}`);
    }

    private toBullMQOptions(options?: JobsOptions): JobsOptions {
        const opts: JobsOptions = {};
        if (options?.jobId !== undefined) opts.jobId = options.jobId;
        if (options?.delay !== undefined) opts.delay = options.delay;
        if (options?.priority !== undefined) opts.priority = options.priority;
        if (options?.attempts !== undefined) opts.attempts = options.attempts
        return opts;
    }


}