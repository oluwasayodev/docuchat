import {PERMISSIONS} from "../src/constants/permissions";
import {logger} from "../src/lib/logger";
import {prisma} from "../src/lib/prisma";
import {RoleName, ROLES} from "../src/constants/roles";




type Role = {
    name: RoleName;
    description: string;
    permissions: string[];
}

const SYSTEM_ROLES: Role[] = [
    {
        name: ROLES.USER,
        description: "Standard system user",
        permissions: [
            PERMISSIONS.USERS_READ
        ]
    },
    {
        name: ROLES.SUPER_ADMIN,
        description: "Full system administrator",
        permissions: Object.values(PERMISSIONS)
    },
    {
        name: ROLES.ADMIN,
        description: "Administrator with user management",
        permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE, PERMISSIONS.USERS_UPDATE],
    }
]


type PermissionKey = {
    resource: string;
    action: string;
}

function parsePermission(permission: string): PermissionKey {
    const [resource, action] = permission.split(":");
    return {resource, action};
}


async function main() {
    logger.info("Seeding database...");

    for(const permission of Object.values(PERMISSIONS)) {
        const {resource, action} = parsePermission(permission);
        await prisma.permission.upsert({
            where: {resource_action: {resource, action}},
            create: {resource, action},
            update: {}
        })
    }

    const existingPermissions = await prisma.permission.findMany({
        select: {id: true, resource: true, action: true}
    });
    const permissionIdByKey = new Map(
        existingPermissions.map(p => [`${p.resource}:${p.action}`, p.id])
    );

    for (const role of SYSTEM_ROLES) {
        const upsertedRole = await prisma.role.upsert({
            where: {name: role.name},
            update: {description: role.description},
            create: {
                name: role.name,
                description: role.description,
            }
        })

        await prisma.rolePermission.createMany({
            data: role.permissions.map(permission => ({
                roleId: upsertedRole.id,
                permissionId: permissionIdByKey.get(permission)!,
            })),
            skipDuplicates: true,
        })
    }
    logger.info("Seeding completed");
}


main()
    .catch((err: Error) => {
        logger.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    })