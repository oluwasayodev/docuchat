import {PinoLogger} from "./pinoLogger";
import {WinstonLogger} from "./winstonLogger";
import {ILogger} from "./logger.interface";
import {instanceCachingFactory} from "tsyringe";
import {AppConfig} from "../lib/config";

export const loggerFactory = instanceCachingFactory<ILogger>((container) => {

    const driver = container.resolve(AppConfig).loggerDriver;

    switch (driver) {
        case "winston":
            return container.resolve(WinstonLogger);
        case "pino":
        default:
            return container.resolve(PinoLogger);
    }
})
