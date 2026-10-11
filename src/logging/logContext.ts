import {ILogger} from "./logger.interface";
import {AsyncLocalStorage} from "node:async_hooks";


export interface LogContext {

    correlationId: string;
    logger: ILogger;
}

const storage = new AsyncLocalStorage<LogContext>();

export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
    return storage.run(context, callback);
}


export function currentLogContext(): LogContext | undefined {
    return storage.getStore();
}
