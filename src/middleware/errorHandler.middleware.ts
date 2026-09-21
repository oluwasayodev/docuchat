import {NextFunction, Request, Response} from "express";
import {HttpError} from "../errors/http.error";
import {logger} from "../lib/logger";


export const globalErrorHandler = (
    err: Error, req: Request, res: Response, next: NextFunction): void => {

    if (err instanceof HttpError) {
        res.status(err.statusCode).json({
            status: 'failed',
            message: err.message,
            statusCode: err.statusCode,
            timestamp: new Date().toISOString(),
        });
        return
    }

    logger.error(`Unhandled error occurred: ${err.message}`);

    res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: "Internal Server Error",
        timestamp: new Date().toISOString(),
    })
}