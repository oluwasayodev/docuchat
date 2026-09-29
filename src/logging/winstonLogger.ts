import {ILogger} from "./logger.interface";
import {inject, injectable} from "tsyringe";
import winston from 'winston'
import {AppConfig} from "../lib/config";


@injectable()
export class WinstonLogger implements ILogger {
    private logger: winston.Logger;
    private readonly appConfig: AppConfig;

    constructor(@inject(AppConfig) appConfig: AppConfig, loggerInstance?: winston.Logger) {
        this.appConfig = appConfig;
        this.logger = loggerInstance || winston.createLogger({
            level: this.appConfig.logLevel,
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [new winston.transports.Console()]
        })
    }

    child(bindings: Record<string, any>): ILogger {
        return new WinstonLogger(this.appConfig, this.logger.child(bindings));
    }

    debug(message: string, meta?: Record<string, any>): void {
        this.logger.debug(message, meta);
    }

    error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
        const errObj = error instanceof Error ? {error: error.message, stack: error.stack} : {error};
        this.logger.error(message, {...errObj, ...meta});
    }

    info(message: string, meta?: Record<string, any>): void {
        this.logger.info(message, meta);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.logger.warn(message, meta);
    }


}