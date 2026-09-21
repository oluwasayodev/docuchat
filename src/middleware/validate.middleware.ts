import {NextFunction, RequestHandler, Request, Response} from "express";
import {plainToInstance} from "class-transformer";
import {validate, ValidationError} from "class-validator";


export function validateDtoMiddleware(dtoClass: any): RequestHandler {

    return async (req, res, next): Promise<void> => {
        const dtoInstance = plainToInstance(dtoClass, req.body);
        const errors: ValidationError[] = await validate(dtoInstance, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

        if (errors.length > 0) {
            const formattedErrors = errors.map((error) => ({
                property: error.property,
                constraints: error.constraints,
            }))

            res.status(400).json({status: "failed", errors: formattedErrors});
            return;
        }

        req.body = dtoInstance;
        next();
    }
};