import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { token, password } = resetPasswordSchema.parse(body);

        const dbToken = await prisma.passwordToken.findFirst({
            where: {
                token,
                type: "RESET",
                expires: { gt: new Date() },
            },
        });

        if (!dbToken) {
            return NextResponse.json(
                { error: "Invalid or expired reset link" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: dbToken.email.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const hashedPassword = await hash(password, 12);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    // If user was suspended, resetting password doesn't automatically unsuspend them
                    // but if they were PENDING (invited but forgot?), maybe set to ACTIVE?
                    // Usually reset is for existing users.
                },
            }),
            prisma.passwordToken.delete({
                where: { id: dbToken.id },
            }),
        ]);

        return NextResponse.json({ message: "Password reset successful" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Reset password error:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}
