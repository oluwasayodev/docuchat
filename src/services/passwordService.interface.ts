import {RequestResetPasswordRequest, ResetPasswordRequest, SetPasswordRequest} from "../dtos/auth.dto";


export interface IPasswordService {
    setPassword(userId: string, dto: SetPasswordRequest): Promise<void>;
    requestPasswordReset(dto: RequestResetPasswordRequest): Promise<void>;
    resetPassword(dto: ResetPasswordRequest): Promise<void>;
}