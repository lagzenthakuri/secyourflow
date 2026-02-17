import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const setPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, password } = setPasswordSchema.parse(body);

        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: { organization: true },
        });

        if (!invitation || invitation.isUsed || invitation.expires < new Date()) {
            return NextResponse.json(
                { error: "Invalid or expired invitation link" },
                { status: 400 }
            );
        }

        const hashedPassword = await hash(password, 12);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email.toLowerCase() },
        });

        if (existingUser) {
            // Update existing user
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    password: hashedPassword,
                    status: "ACTIVE",
                    emailVerified: new Date(),
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                },
            });
        } else {
            // Create new user
            await prisma.user.create({
                data: {
                    email: invitation.email.toLowerCase(),
                    password: hashedPassword,
                    status: "ACTIVE",
                    emailVerified: new Date(),
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                    name: invitation.email.split("@")[0], // Fallback name
                },
            });
        }

        // Mark invitation as used
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { isUsed: true },
        });

        return NextResponse.json({ message: "Password set successfully" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Set password error:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}
