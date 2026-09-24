import {EventMap} from "./event.types";


export interface EventOptions {
    key?: string;
    headers?: Record<string, string>;
}


export interface IEventBus {
    publish<K extends keyof EventMap>(event: K, payload: EventMap[K], options?: EventOptions): Promise<void>;
    subscribe<K extends keyof EventMap>(event: K, listener: (payload: EventMap[K]) => Promise<void> | void): Promise<void>;
}