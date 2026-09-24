import {EventOptions, IEventBus} from "./eventBus.interface";
import {EventMap} from "./event.types";
import {EventEmitter} from "node:events";
import {logger} from "../lib/logger";
import {injectable, singleton} from "tsyringe";

@injectable()
export class InMemoryEventBus implements IEventBus {

    private emitter = new EventEmitter();

    constructor() {
        this.emitter.setMaxListeners(25);
    }
    async publish<K extends keyof EventMap>(event: K, payload: EventMap[K], options?: EventOptions): Promise<void> {
        this.emitter.emit(event as string, payload);
    }

    async subscribe<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => (Promise<void> | void)): Promise<void> {
        this.emitter.on(event as string, async (data) => {
            try {
                await listener(data);
            } catch (error) {
                logger.error(`[InMemoryEventBus] Error handling ${String(event)}: ${error}`);
            }
        });
    }


}