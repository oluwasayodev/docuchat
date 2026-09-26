import {inject, injectable} from "tsyringe";
import {IUserService} from "../services/userService.interface";
import {Controller, Get, Middlewares, Path, Route, Security, SuccessResponse, Tags} from "tsoa";
import {UserResponse} from "../dtos/user.dto";
import {hasPermission} from "../middleware/auth.middleware";
import {PERMISSIONS} from "../constants/permissions";
import {Serialize} from "../middleware/serialize.middleware";


@injectable()
@Route("users")
@Tags("Users")
export class UserController extends Controller{

    constructor(@inject("IUserService") private userService: IUserService) {
        super()
    }

    @Get("{id}")
    @SuccessResponse("200", "OK")
    @Security("jwt")
    @Middlewares(hasPermission(PERMISSIONS.USERS_READ), Serialize(UserResponse))
    async getUser(@Path() id: string): Promise<UserResponse>  {
        const user = await this.userService.getUserProfile(String(id));
        return user as UserResponse;

    }
}