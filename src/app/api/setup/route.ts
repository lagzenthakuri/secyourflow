import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET() {
    try {
        const userCount = await prisma.user.count();
        return NextResponse.json({ setupRequired: userCount === 0 });
    } catch (error) {
        console.error("Setup Check Error:", error);
        return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
        }

        const { email, password, name, organizationName } = await req.json();

        if (!email || !password || !organizationName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const hashedPassword = await hash(password, 12);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organization.create({
                data: {
                    name: organizationName,
                    isActive: true,
                    activatedAt: new Date(),
                }
            });

            // 2. Create Product Key (Full license for initial admin)
            await tx.productKey.create({
                data: {
                    key: `ROOT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    organizationId: org.id,
                    userLimit: 999,
                    expiry: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000), // 10 years
                    status: "ACTIVATED",
                }
            });

            // 3. Create Super Admin
            const user = await tx.user.create({
                data: {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    name: name || "Super Admin",
                    role: "SUPER_ADMIN",
                    status: "ACTIVE",
                    organizationId: org.id,
                    emailVerified: new Date(),
                }
            });

            return { user, org };
        });

        return NextResponse.json({ 
            message: "Setup successful", 
            user: { email: result.user.email },
            nextSteps: "You can now log in with your credentials."
        });
    } catch (error) {
        console.error("Setup Execution Error:", error);
        return NextResponse.json({ 
            error: "Setup failed",
            message: error instanceof Error ? error.message : "Internal error"
        }, { status: 500 });
    }
}
