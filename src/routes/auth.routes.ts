import {Router} from "express";
import {AuthController} from "../controllers/auth.controller";
import {container} from "../container";
import {AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest} from "../dtos/auth.dto";
import {validateDtoMiddleware} from "../middleware/validate.middleware";
import {Serialize} from "../middleware/serialize.middleware";
import {authenticate} from "../middleware/auth.middleware";


const router = Router();
const authController = container.resolve(AuthController);

router.post(
    "/register",
    validateDtoMiddleware(RegisterRequest),
    Serialize(AuthResponse),
    authController.register
);


router.post(
    "/login",
    validateDtoMiddleware(LoginRequest),
    Serialize(AuthResponse),
    authController.login
);


router.post(
    "/token/refresh",
    validateDtoMiddleware(RefreshTokenRequest),
    Serialize(AuthResponse),
    authController.refreshToken
);


router.post(
    "/logout",
    authenticate,
    validateDtoMiddleware(RefreshTokenRequest),
    authController.logout
);


export default router;