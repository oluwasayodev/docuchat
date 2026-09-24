

export const AUTH_EVENTS = {
    USER_REGISTERED: "auth:user-registered",
    USER_LOGIN: "auth:user-login",
} as const;

export type AuthEventMap = {
    [AUTH_EVENTS.USER_REGISTERED]: {userId: string, email: string};
    [AUTH_EVENTS.USER_LOGIN]: {userId: string, ipAddress?: string};
}