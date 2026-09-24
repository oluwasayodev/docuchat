import {DependencyContainer, instanceCachingFactory} from "tsyringe";
import {IStorageService} from "./storageService.interface";
import {S3StorageService} from "./s3Storage.service";
import {LocalStorageService} from "./localStorage.service";
import {AppConfig} from "../lib/config";


export const storageFactory = instanceCachingFactory<IStorageService>((c: DependencyContainer) => {

    const driver = c.resolve(AppConfig).storageDriver;

    switch (driver) {
        case "s3":
        case "minio":
            return c.resolve(S3StorageService)
        case "local":
            default:
                return c.resolve(LocalStorageService);

    }
})
