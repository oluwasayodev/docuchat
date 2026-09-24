import {IPasswordService} from "./passwordService.interface";
import {inject, injectable} from "tsyringe";
import {RequestResetPasswordRequest, ResetPasswordRequest, SetPasswordRequest} from "../dtos/auth.dto";
import {IUserRepository} from "../repositories/userRepository.interface";
import {IRefreshTokenRepository} from "../repositories/refreshTokenRepository.interface";
import {ILogger} from "../logging/logger.interface";
import {ICacheService} from "../cache/cacheService.interface";
import {AppConfig} from "../lib/config";
import jwt from "jsonwebtoken";
import {BadRequestException, ConflictException, NotFoundError} from "../errors/http.error";
import bcrypt from "bcryptjs";



@injectable()
export class PasswordService implements IPasswordService {


    constructor(
        @inject("IUserRepository") private userRepository: IUserRepository,
        @inject("IRefreshTokenRepository") private refreshTokenRepository: IRefreshTokenRepository,
        @inject("ILogger") private logger: ILogger,
        @inject("ICacheService") private cache: ICacheService,
        @inject(AppConfig) private appConfig: AppConfig,
    ) {}

    async requestPasswordReset(dto: RequestResetPasswordRequest): Promise<void> {
        this.logger.info("Password reset reqested", {email: dto.email});
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            this.logger.warn("Password reset requested for non-existing email", {email: dto.email});
            return;
        }

        const secret =  this.appConfig.jwtSecret + (user.passwordHash || "");
        const resetToken = jwt.sign({userId: user.id}, secret, {expiresIn: '15m'});
        const resetLink = `${this.appConfig.clientUrl ?? `http://localhost:${this.appConfig.port}`}/reset-password?token=${resetToken}`;

        // add queue
        // await this.queue.addJob(
        //     "queue-name",
        //     "send-password-reset-email",
        //     {to: user.email, name: user.name, resetLink},
        //     {attempts: 3, backoff: {type: 'exponential', delay: 2000}}
        // )

        this.logger.info("Password reset email job enqueued successfully", {userId: user.id})

    }

    async resetPassword(dto: ResetPasswordRequest): Promise<void> {

        this.logger.info("Attempting password reset with token");
        const decoded = jwt.decode(dto.token) as {userId: string} | null;

        if (!decoded || !decoded.userId) {
            this.logger.warn("Password reset failed: Malformed reset token");
            throw new BadRequestException("Invalid or expired password reset token");
        }

        const user = await this.userRepository.findById(decoded.userId);
        if (!user) {
            this.logger.warn("Password reset failed: User not found", {userId: decoded.userId});
            throw new BadRequestException("Invalid or expired password reset token")
        }

        const secret = this.appConfig.jwtSecret + (user.passwordHash || "");
        try {
            jwt.verify(dto.token, secret);

        } catch (error) {
            this.logger.warn("Password reset failed: Token verification failed or expired", {userId: user.id});
            throw new BadRequestException("Invalid or expired password reset token");
        }

        const newPasswordHash = await bcrypt.hash(dto.newPassword, this.appConfig.bcryptSaltRounds);
        await this.userRepository.updatePasswordAndLinkIdentity(user.id, newPasswordHash, user.email);


        await this.cache.del(`user:session:${user.id}`);
        await this.refreshTokenRepository.deleteAllForUser(user.id);

        this.logger.info("Password reset completed successfully. All previous sessions revoked", {userId: user.id});
    }

    async setPassword(userId: string, dto: SetPasswordRequest): Promise<void> {
        this.logger.info("Setting initial pasword for user: ", {userId: userId});
        const user = await this.userRepository.findByIdWithRelations(userId);
        if (!user) {
            this.logger.error("Set password failed: User not found", {userId: userId});
            throw new NotFoundError("User not found");
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, this.appConfig.bcryptSaltRounds);
        await this.userRepository.updatePasswordAndLinkIdentity(userId, passwordHash, user.email);

        this.logger.info("Password updated successfully", {userId: userId});
    }


}