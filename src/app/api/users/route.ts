import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { extractRequestContext } from "@/lib/request-utils";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { sendRoleInvitationEmail } from "@/lib/mail";

export async function GET(request: NextRequest) {
    try {
        const scope = request.nextUrl.searchParams.get("scope")?.toLowerCase();
        const isBasicScope = scope === "basic";

        const authResult = await requireSessionWithOrg(
            request,
            isBasicScope ? {} : { allowedRoles: ["MAIN_OFFICER", "SUPER_ADMIN"] },
        );
        if (!authResult.ok) return authResult.response;

        const users = await prisma.user.findMany({
            where: { organizationId: authResult.context.organizationId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLogin: true,
                createdAt: true,
            }
        });

        if (isBasicScope) {
            return NextResponse.json(
                users.map((user) => ({
                    id: user.id,
                    name: user.name || "Unknown User",
                    role: user.role,
                })),
            );
        }

        const formattedUsers = users.map(user => ({
            id: user.id,
            name: user.name || "Unknown User",
            email: user.email,
            role: user.role,
            department: "Security", // Department isn't in schema yet, fallback
            lastActive: user.lastLogin ? getTimeAgo(new Date(user.lastLogin)) : "Never",
            status: user.lastLogin && (Date.now() - new Date(user.lastLogin).getTime() < 5 * 60 * 1000) ? "online" : "offline"
        }));

        return NextResponse.json(formattedUsers);
    } catch (error) {
        console.error("Users API Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER", "SUPER_ADMIN"] });
        if (!authResult.ok) return authResult.response;

        const ctx = extractRequestContext(request);

        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const validRoles = new Set(["ANALYST", "IT_OFFICER", "PENTESTER", "MAIN_OFFICER", "SUPER_ADMIN"]);
        if (!validRoles.has(role)) {
            return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
        }

        const targetUser = await prisma.user.findFirst({
            where: {
                id: userId,
                organizationId: authResult.context.organizationId,
            },
            select: { role: true, email: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
        }

        if (targetUser.role === "SUPER_ADMIN") {
            return NextResponse.json({ error: "SUPER_ADMIN credentials cannot be modified" }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        await logActivity(
            "Role updated",
            "user",
            updatedUser.email,
            targetUser.role ? { role: targetUser.role } : null,
            { role },
            `Role changed from ${targetUser.role} to ${role} by ${authResult.context.userId}`,
            authResult.context.userId,
            ctx,
        );

        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error("Update User Error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER", "SUPER_ADMIN"] });
        if (!authResult.ok) return authResult.response;

        const body = await request.json();
        const { email, role } = body;
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

        if (!normalizedEmail || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const validRoles = new Set(["ANALYST", "IT_OFFICER", "PENTESTER", "MAIN_OFFICER", "SUPER_ADMIN"]);
        if (!validRoles.has(role)) {
            return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
        }

        // Check license limits
        const org = await prisma.organization.findUnique({
            where: { id: authResult.context.organizationId },
            include: {
                productKey: true,
                _count: { select: { users: true } }
            }
        });

        if (org?.productKey) {
            const currentUsers = org._count.users;
            const pendingInvitations = await prisma.invitation.count({
                where: {
                    organizationId: org.id,
                    isUsed: false,
                    expires: { gt: new Date() }
                }
            });

            if (currentUsers + pendingInvitations >= org.productKey.userLimit) {
                return NextResponse.json(
                    { error: "User limit exceeded for your license" },
                    { status: 403 }
                );
            }
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                email: normalizedEmail,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists in your organization" }, { status: 409 });
        }

        const token = crypto.randomUUID();
        const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

        await prisma.invitation.upsert({
            where: {
                email_organizationId: {
                    email: normalizedEmail,
                    organizationId: authResult.context.organizationId,
                },
            },
            update: {
                role,
                token,
                expires,
                isUsed: false,
            },
            create: {
                email: normalizedEmail,
                organizationId: authResult.context.organizationId,
                role,
                token,
                expires,
            },
        });

        const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/set-password?token=${token}`;

        const mailResult = await sendRoleInvitationEmail({
            to: normalizedEmail,
            role,
            inviteLink,
            organizationId: authResult.context.organizationId,
        });

        if (!mailResult.sent) {
            console.log(`[USER INVITATION] Email: ${normalizedEmail}, Link: ${inviteLink}, EmailStatus: not_configured`);
            return NextResponse.json({
                message: "Invitation created, but email service is not configured",
                emailStatus: "not_configured",
                emailError: mailResult.reason || null,
                inviteLink,
            });
        }

        return NextResponse.json({ message: "Invitation sent successfully", emailStatus: "sent" });
    } catch (error) {
        console.error("Invite User Error:", error);
        return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
    }
}

function getTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
