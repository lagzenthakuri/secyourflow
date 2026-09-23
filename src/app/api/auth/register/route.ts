import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError, markDatabaseUnavailable } from "@/lib/database-availability";
import { extractRequestContext } from "@/lib/request-utils";
import { consumeAuthRateLimit } from "@/lib/security/auth-rate-limit";
import { buildDefaultOrganizationName } from "@/lib/user-provisioning";

const registerSchema = z
    .object({
        name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
        email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
    })
    .strict();

function isPublicRegistrationAllowed(): boolean {
    return process.env.ALLOW_PUBLIC_REGISTRATION === "true";
}

function getErrorCode(error: unknown): string | null {
    if (typeof error !== "object" || error === null || !("code" in error)) {
        return null;
    }

    return typeof error.code === "string" ? error.code : null;
}

function jsonResponse(body: object, status: number): NextResponse {
    const response = NextResponse.json(body, { status });
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export async function POST(request: NextRequest) {
    if (!isPublicRegistrationAllowed()) {
        return jsonResponse(
            {
                error: "Public registration is disabled.",
                code: "REGISTRATION_DISABLED",
            },
            403,
        );
    }

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return jsonResponse({ error: "Request body must be valid JSON." }, 400);
    }

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
        return jsonResponse({ error: parsed.error.issues[0]?.message || "Invalid registration data." }, 400);
    }

    const { name, email, password } = parsed.data;
    const requestContext = extractRequestContext(request);
    const rateLimit = await consumeAuthRateLimit("registration", {
        ipAddress: requestContext.ipAddress,
        email,
    });

    if (!rateLimit.allowed) {
        const response = jsonResponse(
            {
                error: "Too many registration attempts. Please try again later.",
                code: "REGISTRATION_RATE_LIMITED",
            },
            429,
        );
        response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
        return response;
    }

    try {
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
            return jsonResponse({ error: "An account with this email already exists." }, 409);
        }

        const passwordHash = await hash(password, 12);
        const user = await prisma.$transaction(async (transaction) => {
            const organization = await transaction.organization.create({
                data: {
                    name: buildDefaultOrganizationName(name, email),
                },
                select: { id: true },
            });

            return transaction.user.create({
                data: {
                    name,
                    email,
                    password: passwordHash,
                    role: "ANALYST",
                    organizationId: organization.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });
        });

        return jsonResponse(
            {
                message: "Account created successfully.",
                user,
            },
            201,
        );
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return jsonResponse({ error: "An account with this email already exists." }, 409);
        }

        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.error("[registration] Database unavailable.", {
                    errorType: error instanceof Error ? error.name : typeof error,
                    errorCode: getErrorCode(error),
                });
            }

            return jsonResponse(
                {
                    error: "Registration is temporarily unavailable. Please try again in a few moments.",
                    code: "REGISTRATION_UNAVAILABLE",
                },
                503,
            );
        }

        console.error("[registration] Unexpected failure:", error);
        return jsonResponse(
            {
                error: "Registration failed. Please try again.",
                code: "REGISTRATION_FAILED",
            },
            500,
        );
    }
}
