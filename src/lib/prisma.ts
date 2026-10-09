import {PrismaClient} from "@prisma/client";
import {config} from "./config";
import {Pool} from "pg";
import {PrismaPg} from "@prisma/adapter-pg";

const connectionString = config.databaseUrl;

const pool = new Pool({connectionString});
const adapter = new PrismaPg(pool);



export const prisma = new PrismaClient({
    adapter,
    log: ['error', 'info', 'query'],
});
