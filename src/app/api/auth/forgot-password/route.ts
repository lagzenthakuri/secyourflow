import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomUUID } from "crypto";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = forgotPasswordSchema.parse(body);

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            // Return success anyway for security (don't reveal if email exists)
            return NextResponse.json({ message: "If an account exists, a reset link has been sent" });
        }

        const token = randomUUID();
        const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

        await prisma.passwordToken.create({
            data: {
                email: email.toLowerCase(),
                token,
                expires,
                type: "RESET",
            },
        });

        const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

        // TODO: Send email
        console.log(`[PASSWORD RESET] Email: ${email}, Link: ${resetLink}`);

        return NextResponse.json({ message: "If an account exists, a reset link has been sent" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Forgot password error:", error);
        return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
    }
}
