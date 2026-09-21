import {inject, injectable} from "tsyringe";
import {IAuthService} from "../services/authService.interface";
import {Request, Response} from "express";
import {RegisterRequest} from "../dtos/auth.dto";


@injectable()
export class AuthController {

    constructor(@inject("IAuthService") private authService: IAuthService) {}


    register = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.register(req.body);
        res.status(201).json(result);
    }

    login = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.login(req.body);
        res.status(200).json(result);
    }

    refreshToken = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.refreshToken(req.body);
        res.status(200).json(result);
    }

    logout = async (req: Request, res: Response): Promise<void> => {
        const result = await this.authService.logout(req.body.refreshToken);
        res.status(204).json();
    }

}