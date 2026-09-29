import "reflect-metadata";
import dotenv from "dotenv";
import {Expose, plainToInstance, Type} from "class-transformer";
import {IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength, validateSync} from "class-validator";


dotenv.config()

export const TOKEN_ENCODINGS = ["cl100k_base" , "o200k_base" , "p50k_base" , "r50k_base"] as const;

export type TokenEncoding = (typeof TOKEN_ENCODINGS)[number];

export enum NodeEnv {
    PRODUCTION = "production",
    DEVELOPMENT = "development",
    TEST = "test",
    QA  = 'qa'
}

export class AppConfig {

    @Expose({name: "NODE_ENV"})
    @IsEnum(NodeEnv)
    @IsOptional()
    readonly env: NodeEnv = NodeEnv.DEVELOPMENT;

    @Expose({name: "PORT"})
    @Type(() => Number)
    @IsInt()
    @Min(3000)
    @Max(65535)
    @IsOptional()
    readonly port: number = 4000;

    @Expose({name: "DATABASE_URL"})
    @IsString()
    @IsOptional()
    readonly databaseUrl?: string;

    @Expose({name: "JWT_SECRET"})
    @IsString()
    @MinLength(1, {message: "JWT_SECRET is required"})
    readonly jwtSecret!: string;

    @Expose({name: "JWT_EXPIRES_IN"})
    @IsString()
    @IsOptional()
    readonly jwtExpiresIn: string = "15m";

    @Expose({name: "REFRESH_TOKEN_EXPIRES_IN"})
    @IsString()
    @IsOptional()
    readonly refreshTokenExpiresIn: string = "7d";

    @Expose({name: "OPENAI_API_KEY"})
    @IsString()
    @IsOptional()
    readonly openaiApiKey?: string;

    @Expose({name: "REDIS_URL"})
    @IsString()
    @IsOptional()
    readonly redisUrl?: string;

    @Expose({name: "APP_URL"})
    @IsString()
    @IsOptional()
    readonly appUrl?: string;

    @Expose({name: "BCRYPT_SALT_ROUNDS"})
    @Type(() => Number)
    @IsInt()
    @Min(4)
    @Max(15)
    @IsOptional()
    readonly bcryptSaltRounds: number = 12;

    @Expose({name: "QUEUE_URL"})
    @IsString()
    @IsOptional()
    readonly queueUrl: string = "redis://127.0.0.1:6379"

    @Expose({name: "QUEUE_ATTEMPTS"})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly queueAttempts: number = 3;

    @Expose({name: "QUEUE_CONCURRENCY"})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly queueConcurrency: number = 5;

    @Expose({name: "WORKER_DRIVER"})
    @IsEnum(["bullmq"])
    @IsOptional()
    readonly workerDriver: "bullmq" = "bullmq"

    @Expose({name: "BULL_BOARD_USERNAME"})
    @IsString()
    @IsOptional()
    readonly bullBoardUsername: string = "admin"

    @Expose({name: "BULL_BOARD_PATH"})
    @IsString()
    @IsOptional()
    readonly bullBoardPath: string = "/admin/queues"

    @Expose({name: "BULL_BOARD_PASSWORD"})
    @IsString()
    @IsOptional()
    readonly bullBoardPassword: string = "admin";



    @Expose({name: "LOGGER_DRIVER"})
    @IsEnum(["pino", "winston"])
    @IsOptional()
    readonly loggerDriver: "pino" | "winston" = "pino";

    @Expose({name: "LOG_LEVEL"})
    @IsString()
    @IsOptional()
    readonly logLevel: string = "info";

    @Expose({name: "EVENTBUS_DRIVER"})
    @IsEnum(["in-memory", "kafka"])
    @IsOptional()
    readonly eventBusDriver: "in-memory" | "kafka" = "in-memory";

    @Expose({name: "STORAGE_DRIVER"})
    @IsEnum(["local", "s3", "minio"])
    @IsOptional()
    readonly storageDriver: "local" | "s3" | "minio" = "local";

    @Expose({name: "CLIENT_URL"})
    @IsString()
    @IsOptional()
    readonly clientUrl?: string;

    @Expose({name: "LOCAL_STORAGE_DIR"})
    @IsString()
    @IsOptional()
    readonly localStorageDir: string = "uploads";

    @Expose({name: "GOOGLE_CLIENT_ID"})
    @IsString()
    @IsOptional()
    readonly googleClientId?: string;

    @Expose({name: "COGNITO_USER_POOL_ID"})
    @IsString()
    @IsOptional()
    readonly cognitoUserPoolId?: string;

    @Expose({name: "COGNITO_CLIENT_ID"})
    @IsString()
    @IsOptional()
    readonly cognitoClientId?: string;

    @Expose({name: "S3_BUCKET"})
    @IsString()
    @IsOptional()
    readonly s3Bucket: string = "docuchat";

    @Expose({name: "AWS_REGION"})
    @IsString()
    @IsOptional()
    readonly awsRegion: string = "us-east-1";

    @Expose({name: "AWS_ACCESS_KEY_ID"})
    @IsString()
    @IsOptional()
    readonly awsAccessKeyId: string = "minioadmin";

    @Expose({name: "AWS_SECRET_ACCESS_KEY"})
    @IsString()
    @IsOptional()
    readonly awsSecretAccessKey: string = "minioadmin";

    @Expose({name: "S3_ENDPOINT"})
    @IsString()
    @IsOptional()
    readonly s3Endpoint?: string;

    @Expose({name: "S3_FORCE_PATH_STYLE"})
    @Type(() => Boolean)
    @IsBoolean()
    @IsOptional()
    readonly s3ForcePathStyle: boolean = false;

    @Expose({name: "KAFKA_BROKER"})
    @IsString()
    @IsOptional()
    readonly kafkaBroker: string = "localhost:9092";

    @Expose({name: "KAFKA_CLIENT_ID"})
    @IsString()
    @IsOptional()
    readonly kafkaClientId: string = "docuchat-client";

    @Expose({name: "KAFKA_CONSUMER_GROUP"})
    @IsString()
    @IsOptional()
    readonly kafkaConsumerGroup: string = "docuchat-consumer-group";

    @Expose({name: "CACHE_DRIVER"})
    @IsEnum(["in-memory", "redis"])
    @IsOptional()
    readonly cacheDriver: "in-memory" | "redis" = "in-memory";

    @Expose({name: "DOCUMENT_MAX_UPLOAD_SIZE_BYTES"})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly documentMaxUploadSizeBytes: number = 10_485_760;

    @Expose({name: "DOCUMENT_CHUNK_SIZE_TOKENS"})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly documentChunkSizeTokens: number = 512;

    @Expose({name: "DOCUMENT_CHUNK_OVERLAP_TOKENS"})
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @IsOptional()
    readonly documentChunkOverlapTokens: number = 50;

    @Expose({name: "DOCUMENT_TOKEN_ENCODING"})
    @IsOptional()
    readonly documentTokenEncoding: TokenEncoding  = "cl100k_base";


    get isProduction(): boolean {
        return this.env === NodeEnv.PRODUCTION;
    }

    get baseUrl(): string {
        return this.appUrl || `http://localhost:${this.port}`;
    }

    static load(): AppConfig {
        const config = plainToInstance(AppConfig, process.env, {exposeDefaultValues: true});
        const errors = validateSync(config, {whitelist: true});

        if (errors.length > 0) {
            console.error("Invalid environment variables");
            for (const err of errors) {
                console.error(`  - ${err.property}: ${Object.values(err.constraints ?? {}).join(", ")}`);
            }
            process.exit(1);
        }
        return config;
    }
}

export const config = AppConfig.load();