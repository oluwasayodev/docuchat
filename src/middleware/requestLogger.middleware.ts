import {RequestHandler, Request, Response, NextFunction} from "express";
import {container} from "../container";
import {ILogger} from "../logging/logger.interface";
import {randomUUID} from "node:crypto";
import {runWithLogContext} from "../logging/logContext";


const CORRELATION_HEADER = "x-correlation-id";


export function requestLoggerMiddleware(): RequestHandler {

    return (req: Request, res, next): void   => {
        const root = container.resolve<ILogger>("ILogger");
        const correlationId = (req.header(CORRELATION_HEADER) ?? "").trim() || randomUUID();
        const log = root.child({correlationId});

        req.correlationId = correlationId;
        req.log = log;
        res.setHeader("X-Correlation-Id", correlationId);

        const start = process.hrtime.bigint();

        res.on("close", () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            log.info("request.completed", {
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                durationMs: Math.round(durationMs),
                aborted: !res.writableEnded
            })
        });

        runWithLogContext({correlationId, logger: log}, () => next());


    }
}