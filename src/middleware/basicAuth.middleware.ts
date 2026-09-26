import {RequestHandler} from "express";
import {config} from "../lib/config";


export const basicAuthMiddleware: RequestHandler = (req, res, next) => {

    const header = req.headers.authorization ?? "";
    const [scheme, encoded] = header.split(" ");
    if (scheme !== "Basic" || !encoded) {
        res.setHeader("WWW-Authenticate", 'Basic realm="admin"');
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    const credentials = Buffer.from(encoded, "base64").toString("utf-8");
    const expected = `${config.bullBoardUsername}:${config.bullBoardPassword}`;

    if (credentials !== expected) {
        res.setHeader("WWW-Authenticate", 'Basic realm="admin"');
        res.status(401).json({message: "Unauthorized"});
        return;
    }

    next();
}