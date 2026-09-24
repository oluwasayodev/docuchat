import {inject, injectable} from "tsyringe";
import {Kafka, Producer, Consumer, EachMessagePayload} from "kafkajs";
import {IEventBus, EventOptions} from "./eventBus.interface";
import {EventMap} from "./event.types";
import {ILogger} from "../logging/logger.interface";
import {AppConfig} from "../lib/config";

@injectable()
export class KafkaEventBus implements IEventBus {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    private isProducerConnected = false;
    private isConsumerConnected = false;
    private isConsumerRunning = false;

    // Connection locks to handle concurrent publish/subscribe calls safely
    private producerConnectPromise: Promise<void> | null = null;
    private consumerConnectPromise: Promise<void> | null = null;

    // In-memory router: Topic -> Set of listener functions
    private handlers = new Map<string, Set<(payload: any) => Promise<void> | void>>();

    constructor(
        @inject("ILogger") private logger: ILogger,
        @inject(AppConfig) private appConfig: AppConfig,
    ) {
        const brokers = this.appConfig.kafkaBroker.split(",").map(b => b.trim());
        const clientId = this.appConfig.kafkaClientId;
        const groupId = this.appConfig.kafkaConsumerGroup;

        this.kafka = new Kafka({
            clientId,
            brokers,
            retry: {
                initialRetryTime: 300,
                retries: 10,
            },
        });

        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId });
    }

    /**
     * Prevents race conditions during simultaneous publish calls.
     */
    private async ensureProducerConnected(): Promise<void> {
        if (this.isProducerConnected) return;

        if (!this.producerConnectPromise) {
            this.producerConnectPromise = this.producer
                .connect()
                .then(() => {
                    this.isProducerConnected = true;
                    this.logger.info("Kafka Producer connected successfully.");
                })
                .catch((err) => {
                    this.producerConnectPromise = null;
                    this.logger.error("Failed to connect Kafka Producer", err);
                    throw err;
                });
        }

        return this.producerConnectPromise;
    }

    /**
     * Prevents race conditions during simultaneous subscribe calls.
     */
    private async ensureConsumerConnected(): Promise<void> {
        if (this.isConsumerConnected) return;

        if (!this.consumerConnectPromise) {
            this.consumerConnectPromise = this.consumer
                .connect()
                .then(() => {
                    this.isConsumerConnected = true;
                    this.logger.info("Kafka Consumer connected successfully.");
                })
                .catch((err) => {
                    this.consumerConnectPromise = null;
                    this.logger.error("Failed to connect Kafka Consumer", err);
                    throw err;
                });
        }

        return this.consumerConnectPromise;
    }

    async publish<K extends keyof EventMap>(
        event: K,
        payload: EventMap[K],
        options?: EventOptions
    ): Promise<void> {
        await this.ensureProducerConnected();
        const topic = String(event);

        try {
            await this.producer.send({
                topic,
                messages: [
                    {
                        key: options?.key,
                        value: JSON.stringify(payload),
                        headers: options?.headers,
                    },
                ],
            });
            this.logger.debug(`Published event to Kafka topic: ${topic}`, { key: options?.key });
        } catch (error) {
            this.logger.error(`Error publishing event ${topic} to Kafka`, error);
            throw error;
        }
    }

    async subscribe<K extends keyof EventMap>(
        event: K,
        listener: (payload: EventMap[K]) => Promise<void> | void
    ): Promise<void> {
        await this.ensureConsumerConnected();
        const topic = String(event);

        // 1. Register topic subscription with Kafka if not already done
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
            await this.consumer.subscribe({ topic, fromBeginning: false });
            this.logger.info(`Subscribed Kafka consumer to topic: ${topic}`);
        }

        // 2. Add listener function to internal route table
        this.handlers.get(topic)!.add(listener);

        // 3. Start processing loop ONCE across all topics
        if (!this.isConsumerRunning) {
            this.startConsumerLoop();
        }
    }

    /**
     * Single consumer loop routing messages to all registered topic handlers.
     */
    private startConsumerLoop(): void {
        this.isConsumerRunning = true;

        this.consumer
            .run({
                eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
                    if (!message.value) return;

                    const topicHandlers = this.handlers.get(topic);
                    if (!topicHandlers || topicHandlers.size === 0) return;

                    // Safe payload parsing
                    let payload: EventMap[keyof EventMap];
                    try {
                        payload = JSON.parse(message.value.toString());
                    } catch (parseError) {
                        this.logger.error(`Failed to parse message JSON on Kafka topic ${topic}`, parseError);
                        return; // Skip corrupted message without crashing loop
                    }

                    // Execute all handlers registered for this topic safely
                    for (const handler of topicHandlers) {
                        try {
                            await handler(payload);
                        } catch (handlerError) {
                            this.logger.error(
                                `Error in event handler for topic '${topic}' (Partition: ${partition}, Offset: ${message.offset})`,
                                handlerError
                            );
                        }
                    }
                },
            })
            .catch((error) => {
                this.logger.error("Fatal error in Kafka consumer run loop", error);
                this.isConsumerRunning = false;
            });
    }

    /**
     * Graceful shutdown hook for application termination.
     */
    async disconnect(): Promise<void> {
        try {
            if (this.isProducerConnected) {
                await this.producer.disconnect();
                this.isProducerConnected = false;
                this.logger.info("Kafka Producer disconnected cleanly.");
            }
            if (this.isConsumerConnected) {
                await this.consumer.disconnect();
                this.isConsumerConnected = false;
                this.isConsumerRunning = false;
                this.logger.info("Kafka Consumer disconnected cleanly.");
            }
        } catch (error) {
            this.logger.error("Error during Kafka disconnect execution", error);
        }
    }
}