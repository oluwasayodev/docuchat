import {ILogger} from "./logger.interface";
import {currentLogContext} from "./logContext";


export class ContextAwareLogger implements ILogger {

    constructor(
        private readonly base: ILogger,
        private readonly bound: boolean = false,
    ) {}

    private get target(): ILogger {
        if (this.bound) return this.base;
        return currentLogContext()?.logger ?? this.base;
    }

    child(bindings: Record<string, any>): ILogger {
        return new ContextAwareLogger(this.base.child(bindings), true);
    }

    debug(message: string, meta?: Record<string, any>): void {
        this.target.debug(message, meta);
    }

    error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
        this.target.error(message, error, meta);
    }

    info(message: string, meta?: Record<string, any>): void {
        this.target.info(message, meta);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.target.warn(message, meta);
    }


}