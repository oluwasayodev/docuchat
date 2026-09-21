import {inject, injectable} from "tsyringe";
import {IUserService} from "../services/userService.interface";
import {Request, Response} from "express";


@injectable()
export class UserController {

    constructor(@inject("IUserService") private userService: IUserService) {}

    getUser = async (req: Request, res: Response): Promise<void> => {
        const user = await this.userService.getUserProfile(String(req.params.id));
        res.status(200).json(user);
    }

    registerUser = async (req: Request, res: Response): Promise<void> => {
        const user = await this.userService.registerUser(req.body);
        res.status(201).json(user);
    }
}