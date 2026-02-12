
import { PrismaClient } from "@prisma/client";

async function main() {
    const prisma = new PrismaClient();
    try {
        const userCount = await prisma.user.count();
        console.log("User count:", userCount);

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                password: true,
                createdAt: true,
                organizationId: true
            }
        });
        console.log("Users:", users);

        const accounts = await prisma.account.count();
        console.log("Account count:", accounts);

        const orgs = await prisma.organization.findMany();
        console.log("Organizations:", orgs);
    } catch (error) {
        console.error("Database error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
