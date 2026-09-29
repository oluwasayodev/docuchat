import {AppConfig} from "../lib/config";
import {RequestHandler} from "express";
import multer from "multer";
import {container} from "../container";


export const documentUpload = (appConfig: AppConfig): RequestHandler => {
    const config = container.resolve(AppConfig);
    return multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: config.documentMaxUploadSizeBytes,
            files: 1
        }
    }).single("file");
}