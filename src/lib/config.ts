import dotenv from "dotenv";
import {z} from "zod";



dotenv.config()

const envSchema = z.object({
    NODE_ENV: z.enum(["production", "development", "test"])
        .default("development"),

    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: z.string().default("15 M"),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
    OPENAI_API_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
    BCRYPT_SALT_ROUNDS: z.coerce.number()

})


const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error("Invalid environment variables");
    // console.error(parsedEnv.error.format());
    console.error(z.treeifyError(parsedEnv.error));
    process.exit(1);
}

export const config = parsedEnv.data;

