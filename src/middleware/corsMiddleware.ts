import {config} from "../lib/config";
import cors, {CorsOptions} from "cors";
import {RequestHandler} from "express";



const allowedOrigins = (config.frontendUrl)
    .split(",")
    .map(origin => origin.toLowerCase().trim())
    .filter(Boolean);


export const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin.toLowerCase())) return callback(null, true);
        callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
}


export const corsMiddleware: RequestHandler = cors(corsOptions);