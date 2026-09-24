import {IStorageService, UploadFileOptions, UploadResult} from "./storageService.interface";
import {DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {inject, singleton} from "tsyringe";
import {AppConfig} from "../lib/config";


@singleton()
export class S3StorageService implements IStorageService {

    private readonly s3: S3Client;
    private readonly bucket: string;

    constructor(@inject(AppConfig) private appConfig: AppConfig) {
        this.bucket = this.appConfig.s3Bucket;
        this.s3 = new S3Client({
            region: this.appConfig.awsRegion,
            credentials: {
                accessKeyId: this.appConfig.awsAccessKeyId,
                secretAccessKey: this.appConfig.awsSecretAccessKey
            },
            endpoint: this.appConfig.s3Endpoint || undefined,
            forcePathStyle: this.appConfig.s3ForcePathStyle
        })
    }

    async delete(key: string): Promise<void> {
        await this.s3.send(new DeleteObjectCommand({Bucket: this.bucket, Key: key}));
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.s3.send(new HeadObjectCommand({Bucket: this.bucket, Key: key}));
            return true;
        } catch (error) {
            return false;
        }
    }

    async getBuffer(key: string): Promise<Buffer> {
        const response = await this.s3.send(new GetObjectCommand({Bucket: this.bucket, Key: key}));
        const stream = response.Body as any;
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
        const command = new GetObjectCommand({Bucket: this.bucket, Key: key});
        return await getSignedUrl(this.s3, command, {expiresIn: expiresInSeconds});
    }

    async upload({key, body, metadata, contentType}: UploadFileOptions): Promise<UploadResult> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                Metadata: metadata,
            })
        )

        return {key, url: await this.getUrl(key)}
    }


}