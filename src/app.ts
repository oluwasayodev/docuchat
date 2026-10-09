import 'reflect-metadata';
import express, {Router} from 'express';
import helmet from 'helmet';
import {config} from "./lib/config";
import {logger} from "./lib/logger";
import {globalErrorHandler} from "./middleware/errorHandler.middleware";
import {NotFoundError} from "./errors/http.error";
import {RegisterRoutes} from "./routes/routes";
import {basicAuthMiddleware} from "./middleware/basicAuth.middleware";
import {getBullBoardRouter} from "./queues/bullBoard.setup";
import swaggerUi from "swagger-ui-express";
import swaggerDoc from './generated/swagger.json';
import {corsMiddleware} from "./middleware/corsMiddleware";


export const app = express();


app.use(corsMiddleware)
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRouter = Router();
RegisterRoutes(apiRouter);

app.use("/api/v1", apiRouter);
app.use(config.bullBoardPath, basicAuthMiddleware, getBullBoardRouter())



app.get("/health", (req, res) => {

    logger.info("Checking health...")

    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: config.env,
    })
})

if (config.env !== "production") {
    app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
}

app.use((req, res, next) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

app.use(globalErrorHandler);


export default app;