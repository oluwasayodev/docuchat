import {PERMISSIONS} from "../src/constants/permissions";
import {logger} from "../src/lib/logger";
import {prisma} from "../src/lib/prisma";




type Role = {
    name: string;
    description: string;
    permissions: string[];
}

const ROLES: Role[] = [
    {
        name: "USER",
        description: "Standard system user",
        permissions: [
            PERMISSIONS.USERS_READ
        ]
    },
    {
        name: "SUPER_ADMIN",
        description: "Full system administrator",
        permissions: Object.values(PERMISSIONS)
    }
]


async function main() {
    logger.info("Seeding database...");

    for(const action of Object.values(PERMISSIONS)) {
        await prisma.permission.upsert({
            where: { action },
            create: {action},
            update: {}
        })
    }


    for (const role of ROLES) {
        await prisma.role.upsert({
            where: {name: role.name},
            update: {
                description: role.description,
                permissions: {
                    connect: role.permissions.map(action => ({action}))
                }
            },
            create: {
                name: role.name,
                description: role.description,
                permissions: {
                    connect: role.permissions.map(action => ({action}))
                }
            }
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