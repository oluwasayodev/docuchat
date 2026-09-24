import {IStorageService, UploadFileOptions, UploadResult} from "./storageService.interface";
import {inject, singleton} from "tsyringe";
import path from "path";
import {AppConfig} from "../lib/config";
import * as fs from "fs";


@singleton()
export class LocalStorageService implements IStorageService {

    private uploadDir: string;
    private baseUrl: string;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {
        this.uploadDir= path.resolve(process.cwd(), this.appConfig.localStorageDir);
        this.baseUrl = this.appConfig.baseUrl;
        fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    async delete(key: string): Promise<void> {
        const filePath = path.join(this.uploadDir, key);
        try {
            fs.unlinkSync(filePath)
        } catch(err: any) {
            if (err.code !== "ENOENT") throw err;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            fs.accessSync(path.join(this.uploadDir, key));
            return true;
        } catch {
            return false;
        }
    }

    async getBuffer(key: string): Promise<Buffer> {
        return fs.readFileSync(path.join(this.uploadDir, key));
    }

    async getUrl(key: string, expiresInSeconds?: number): Promise<string> {
        return `${this.baseUrl}/uploads/${key}`;
    }

    async upload({key, body}: UploadFileOptions): Promise<UploadResult> {
        const filePath = path.join(this.uploadDir, key);
        fs.mkdirSync(filePath, { recursive: true });

        const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
        fs.writeFileSync(filePath, buffer);


        return {key, url: await this.getUrl(key), size: buffer.length}


    }


}