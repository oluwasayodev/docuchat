import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {config} from "./lib/config";
import {logger} from "./lib/logger";
import {globalErrorHandler} from "./middleware/errorHandler.middleware";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";


export const app = express();


app.use(cors())
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get("/health", (req, res) => {

    logger.info("Checking health...")

    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
    })
})

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/users", userRoutes);

app.use(globalErrorHandler);


export default app;