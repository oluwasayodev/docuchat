

export const ROLES = {
    USER: "USER",
    ADMIN: "ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
} as const;


export type RoleName = (typeof ROLES)[keyof typeof ROLES];