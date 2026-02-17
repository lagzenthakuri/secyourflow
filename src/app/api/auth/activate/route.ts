import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const activateSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    productKey: z.string().min(1, "Product key is required"),
    name: z.string().min(1, "Full name is required"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, password, productKey, name } = activateSchema.parse(body);

        const dbToken = await prisma.passwordToken.findFirst({
            where: {
                token,
                type: "ACTIVATION",
                expires: { gt: new Date() },
            },
        });

        if (!dbToken) {
            return NextResponse.json(
                { error: "Invalid or expired activation link" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: dbToken.email.toLowerCase() },
            include: { organization: { include: { productKey: true } } },
        });

        if (!user || !user.organization) {
            return NextResponse.json(
                { error: "User or organization not found" },
                { status: 404 }
            );
        }

        if (user.status === "ACTIVE") {
            return NextResponse.json(
                { error: "Account already activated" },
                { status: 400 }
            );
        }

        const orgProductKey = await prisma.productKey.findUnique({
            where: { organizationId: user.organization.id },
        });

        if (!orgProductKey) {
            return NextResponse.json(
                { error: "No product key found for this organization" },
                { status: 400 }
            );
        }

        if (orgProductKey.key !== productKey) {
            return NextResponse.json(
                { error: "Invalid product key" },
                { status: 400 }
            );
        }

        if (orgProductKey.status !== "UNUSED") {
            return NextResponse.json(
                { error: "Product key already used or revoked" },
                { status: 400 }
            );
        }

        const hashedPassword = await hash(password, 12);

        // Transaction to update user, organization, and product key
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    name,
                    password: hashedPassword,
                    status: "ACTIVE",
                    emailVerified: new Date(),
                },
            }),
            prisma.organization.update({
                where: { id: user.organization.id },
                data: {
                    isActive: true,
                    activatedAt: new Date(),
                },
            }),
            prisma.productKey.update({
                where: { id: orgProductKey.id },
                data: {
                    status: "ACTIVATED",
                },
            }),
            prisma.passwordToken.delete({
                where: { id: dbToken.id },
            }),
        ]);

        return NextResponse.json({ message: "Activation successful" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Activation error:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}
