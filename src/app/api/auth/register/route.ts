import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    inviteToken: z.string().optional(),
});

function isPublicRegistrationEnabled(): boolean {
    if (process.env.NODE_ENV !== "production") {
        return true;
    }
    return process.env.ENABLE_PUBLIC_REGISTRATION === "true";
}

function getRegistrationOrganizationId(): string | null {
    const configured = process.env.REGISTRATION_DEFAULT_ORGANIZATION_ID;
    if (!configured || configured.trim().length === 0) {
        return null;
    }
    return configured.trim();
}

function hasValidInviteToken(candidate: string | undefined, headerToken: string | null): boolean {
    const configuredToken = process.env.REGISTRATION_INVITE_TOKEN;
    if (!configuredToken) {
        return false;
    }

    const provided = (candidate || headerToken || "").trim();
    if (!provided) {
        return false;
    }

    const configuredBuffer = Buffer.from(configuredToken, "utf8");
    const providedBuffer = Buffer.from(provided, "utf8");

    if (configuredBuffer.length !== providedBuffer.length) {
        return false;
    }

    return timingSafeEqual(configuredBuffer, providedBuffer);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email: rawEmail, password, inviteToken } = registerSchema.parse(body);
        const email = rawEmail.trim().toLowerCase();
        const normalizedName = name.trim();

        if (!isPublicRegistrationEnabled()) {
            const headerInviteToken = req.headers.get("x-registration-invite-token");
            if (!hasValidInviteToken(inviteToken, headerInviteToken)) {
                return NextResponse.json(
                    { error: "Registration is restricted. Valid invite token required." },
                    { status: 403 },
                );
            }
        }

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

        const registrationOrganizationId = getRegistrationOrganizationId();
        if (!registrationOrganizationId) {
            return NextResponse.json(
                {
                    error:
                        "Registration is unavailable. REGISTRATION_DEFAULT_ORGANIZATION_ID is not configured.",
                },
                { status: 503 },
            );
        }

        const defaultOrganization = await prisma.organization.findUnique({
            where: { id: registrationOrganizationId },
            select: { id: true },
        });

        if (!defaultOrganization) {
            return NextResponse.json(
                { error: "Registration is temporarily unavailable. Registration organization is invalid." },
                { status: 503 },
            );
        }

        const user = await prisma.user.create({
            data: {
                name: normalizedName,
                email,
                password: hashedPassword,
                role: "ANALYST", // Default role
                organizationId: defaultOrganization.id,
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
