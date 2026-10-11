import {ILogger} from "./logger.interface";
import {inject, injectable} from "tsyringe";
import winston from 'winston'
import {AppConfig} from "../lib/config";
import {formatConsoleLine} from "./consoleFormat";


@injectable()
export class WinstonLogger implements ILogger {
    private logger: winston.Logger;
    private readonly config: AppConfig;

    constructor(@inject(AppConfig) appConfig: AppConfig, loggerInstance?: winston.Logger) {
        this.config = appConfig;
        this.logger = loggerInstance || winston.createLogger({
            level: this.config.logLevel,
            format: this.buildFormat(),
            transports: [new winston.transports.Console()]
        })
    }

    child(bindings: Record<string, any>): ILogger {
        return new WinstonLogger(this.config, this.logger.child(bindings));
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


    private buildFormat() {
        if (this.config.env === "production") {
            return winston.format.combine(winston.format.timestamp(), winston.format.json());
        }

        return winston.format.printf(info => formatConsoleLine(info as Record<string, any>));
    }
}