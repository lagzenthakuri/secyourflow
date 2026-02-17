import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { hash } from "bcryptjs";

async function main() {
    // Dynamic import to ensure process.env is populated before prisma initialization
    const { prisma } = await import("../src/lib/prisma");

    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error("Usage: npx tsx scripts/create-super-admin.ts <email> <password>");
        process.exit(1);
    }

    console.log(`Setting up Super Admin: ${email}...`);

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email: email.toLowerCase() },
        update: {
            password: hashedPassword,
            role: "SUPER_ADMIN" as any,
            status: "ACTIVE",
            emailVerified: new Date(),
        },
        create: {
            email: email.toLowerCase(),
            name: "Super Admin",
            password: hashedPassword,
            role: "SUPER_ADMIN" as any,
            status: "ACTIVE",
            emailVerified: new Date(),
        },
    });

    console.log(`🚀 Super Admin created/updated: ${user.email}`);
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
