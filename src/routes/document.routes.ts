import {IRoute, Router} from "express";


export const documentRoutes = Router();

documentRoutes.route("/").get()