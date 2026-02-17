import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-auth";
import { randomUUID } from "crypto";
import { sendOrganizationActivationEmail } from "@/lib/mail";

export async function GET(req: Request) {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.ok) return authResult.response;

    try {
        const organizations = await prisma.organization.findMany({
            include: {
                productKey: true,
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const mainOfficers = await prisma.user.findMany({
            where: {
                organizationId: { in: organizations.map((org) => org.id) },
                role: "MAIN_OFFICER",
            },
            select: {
                email: true,
                organizationId: true,
            },
        });

        const officerByOrganization = new Map(
            mainOfficers.map((officer) => [officer.organizationId, officer.email]),
        );

        const activationTokens = mainOfficers.length
            ? await prisma.passwordToken.findMany({
                where: {
                    email: { in: mainOfficers.map((officer) => officer.email) },
                    type: "ACTIVATION",
                    expires: { gt: new Date() },
                },
                orderBy: [{ email: "asc" }, { createdAt: "desc" }],
            })
            : [];

        const tokenByEmail = new Map<string, string>();
        for (const token of activationTokens) {
            if (!tokenByEmail.has(token.email)) {
                tokenByEmail.set(token.email, token.token);
            }
        }

        const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        return NextResponse.json(
            organizations.map((organization) => {
                const officerEmail = officerByOrganization.get(organization.id) || null;
                const activationToken = officerEmail ? tokenByEmail.get(officerEmail) : null;
                return {
                    ...organization,
                    mainOfficerEmail: officerEmail,
                    activationLink: activationToken ? `${appUrl}/activate?token=${activationToken}` : null,
                };
            }),
        );
    } catch (error) {
        console.error("Failed to fetch organizations:", error);
        return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const authResult = await requireSuperAdmin(req);
    if (!authResult.ok) return authResult.response;

    try {
        const { name, email, userLimit, expiryMonths } = await req.json();
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        if (!name || !normalizedEmail) {
            return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { role: true },
        });

        if (existingUser?.role === "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "This email belongs to a SUPER_ADMIN. Use a different officer email." },
                { status: 409 },
            );
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + (expiryMonths || 12));

        const productKeyStr = `SYF-${randomUUID().slice(0, 4)}-${randomUUID().slice(0, 4)}-${randomUUID().slice(0, 4)}`.toUpperCase();
        const activationToken = randomUUID();

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Organization
            const org = await tx.organization.create({
                data: {
                    name,
                    isActive: false, // Will be activated via product key
                },
            });

            // 2. Create Product Key
            await tx.productKey.create({
                data: {
                    key: productKeyStr,
                    organizationId: org.id,
                    userLimit: userLimit || 10,
                    expiry: expiryDate,
                    status: "UNUSED",
                },
            });

            // 3. Create/Update User as Main Officer
            await tx.user.upsert({
                where: { email: normalizedEmail },
                update: {
                    organizationId: org.id,
                    role: "MAIN_OFFICER",
                    status: "PENDING",
                },
                create: {
                    email: normalizedEmail,
                    name: normalizedEmail.split("@")[0],
                    organizationId: org.id,
                    role: "MAIN_OFFICER",
                    status: "PENDING",
                },
            });

            // 4. Create Activation Token
            await tx.passwordToken.create({
                data: {
                    email: normalizedEmail,
                    token: activationToken,
                    expires: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days
                    type: "ACTIVATION",
                },
            });

            return { org, productKey: productKeyStr, activationToken };
        });

        const activationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/activate?token=${result.activationToken}`;

        let emailStatus: "sent" | "not_configured" | "failed" = "not_configured";
        let emailError: string | null = null;
        try {
            const mailResult = await sendOrganizationActivationEmail({
                to: normalizedEmail,
                organizationName: name,
                productKey: result.productKey,
                activationLink,
            });
            if (mailResult.sent) {
                emailStatus = "sent";
            } else {
                emailStatus = "not_configured";
                emailError = mailResult.reason || null;
            }
        } catch (mailError) {
            emailStatus = "failed";
            emailError = mailError instanceof Error ? mailError.message : "Failed to send activation email";
        }

        console.log(`[ORG CREATION] Org: ${name}, Email: ${email}, Key: ${result.productKey}, Link: ${activationLink}, EmailStatus: ${emailStatus}`);

        return NextResponse.json({
            message: "Organization created successfully",
            organizationId: result.org.id,
            productKey: result.productKey,
            activationLink,
            emailStatus,
            emailError,
        });
    } catch (error) {
        console.error("Org Creation Error:", error);
        return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
    }
}
