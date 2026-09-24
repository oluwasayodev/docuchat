import {ILogger} from "./logger.interface";
import pino, {Logger as PinoNative } from "pino";
import {inject, injectable, singleton} from "tsyringe";
import {AppConfig} from "../lib/config";


@injectable()
export class PinoLogger implements ILogger {

    private pino: PinoNative;
    private appConfig: AppConfig;

    constructor(@inject(AppConfig) appConfig: AppConfig, pinoInstance?: PinoNative) {
        this.appConfig = appConfig;
        this.pino = pinoInstance || pino({
            level: this.appConfig.logLevel,
            transport: this.appConfig.env !== 'production' ? {target: 'pino-pretty'} : undefined,
        })
    }

    child(bindings: Record<string, any>): ILogger {
        return new PinoLogger(this.appConfig, this.pino.child(bindings));
    }

    debug(message: string, meta?: Record<string, any>): void {
        this.pino.debug(meta || {}, message);
    }

    error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
        const errorObj = error instanceof Error ? {err: error} : {error};
        this.pino.error({...errorObj, ...meta}, message);
    }

    info(message: string, meta?: Record<string, any>): void {
        this.pino.info(meta || {}, message);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.pino.warn(meta || {}, message);
    }


}