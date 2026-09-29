import {NextFunction, Request, Response} from "express";
import {BadRequestException, HttpError, PayloadTooLargeError} from "../errors/http.error";
import {logger} from "../lib/logger";
import multer from "multer";
import {container} from "../container";
import {AppConfig} from "../lib/config";


export const globalErrorHandler = (
    err: Error, req: Request, res: Response, next: NextFunction): void => {

    const config = container.resolve(AppConfig);

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            err = new PayloadTooLargeError(
                `File exceeds the maximum allowed size of ${config.documentMaxUploadSizeBytes} bytes`
            )
        } else {
            err = new BadRequestException(err.message);
        }

    }

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