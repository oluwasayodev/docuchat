

export const PERMISSIONS = {
    USERS_READ: "users:read",
    USERS_WRITE: "users:write",
    USERS_DELETE: "users:delete",
    USERS_UPDATE: "users:update",
} as const;

export type PermissionAction = typeof PERMISSIONS[keyof typeof PERMISSIONS];