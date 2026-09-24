

export interface UploadFileOptions {

    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
    metadata?: Record<string, string>;
}


export interface UploadResult {
    key: string;
    url: string;
    size?: number;
}


export interface IStorageService {
    upload(options: UploadFileOptions): Promise<UploadResult>;
    delete(key: string): Promise<void>;
    getUrl(key: string, expiresInSeconds?: number): Promise<string>;
    exists(key: string): Promise<boolean>;
    getBuffer(key: string): Promise<Buffer>;
}