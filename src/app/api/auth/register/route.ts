import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Check if public registration is allowed
 * Public registration is only allowed when explicitly enabled via env var.
 */
function isPublicRegistrationAllowed(): boolean {
    // Explicit opt-in across all environments
    return process.env.ALLOW_PUBLIC_REGISTRATION === "true";
}

export async function POST(req: Request) {
    try {
        if (!isPublicRegistrationAllowed()) {
            return NextResponse.json(
                { 
                    error: "Public registration is disabled.",
                    code: "REGISTRATION_DISABLED"
                },
                { status: 403 },
            );
        }

        const body = await req.json();
        const { name, email: rawEmail, password } = registerSchema.parse(body);
        const email = rawEmail.trim().toLowerCase();
        const normalizedName = name.trim();

        const existingUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: "insensitive",
                },
            },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await hash(password, 12);

        // For development only: auto-assign to first organization or create default
        let organizationId: string;
        const firstOrg = await prisma.organization.findFirst({ select: { id: true } });
        
        if (firstOrg) {
            organizationId = firstOrg.id;
        } else {
            const newOrg = await prisma.organization.create({
                data: { name: "Default Organization" },
                select: { id: true },
            });
            organizationId = newOrg.id;
        }

        const user = await prisma.user.create({
            data: {
                name: normalizedName,
                email,
                password: hashedPassword,
                role: "ANALYST",
                organizationId,
            },
        });

        // Remove password from response
        const { password: storedPassword, ...userWithoutPassword } = user;
        void storedPassword;

        return NextResponse.json(
            { message: "User created successfully", user: userWithoutPassword },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0].message },
                { status: 400 }
            );
        }

        console.error("Registration error:", error instanceof Error ? error.message : String(error));

        return NextResponse.json(
            {
                error: "Registration failed",
                message: "An internal error occurred",
            },
            { status: 500 },
        );
    }
}
