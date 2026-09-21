import {ClassConstructor, instanceToPlain, plainToInstance} from "class-transformer";
import {NextFunction, Response, Request} from "express";


export const Serialize = (dtoClass: ClassConstructor<unknown>)=> {
    return (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json;
        res.json = function (data) {
            const transformed = plainToInstance(dtoClass, data)

            return originalJson.call(this, instanceToPlain(transformed, {
                excludeExtraneousValues: true
            }));
        }
        next();
    }
}