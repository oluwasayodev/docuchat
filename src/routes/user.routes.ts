import {Router} from "express";
import {container} from "../container";
import {UserController} from "../controllers/user.controller";
import {authenticate} from "../middleware/auth.middleware";
import {Serialize} from "../middleware/serialize.middleware";
import {UserResponse} from "../dtos/user.dto";


const router = Router();
const userController = container.resolve(UserController);

router.get(
    "/:id",
    // authenticate,
    Serialize(UserResponse),
    userController.getUser
)

export default router;