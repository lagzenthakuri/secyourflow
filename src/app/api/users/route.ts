import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { extractRequestContext } from "@/lib/request-utils";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
    try {
        const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
        if (!authResult.ok) return authResult.response;

        // Ideally, we'd filter by organizationId if multi-tenant
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
        const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
        if (!authResult.ok) return authResult.response;

        const ctx = extractRequestContext(request);

        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const validRoles = new Set(["ANALYST", "IT_OFFICER", "PENTESTER", "MAIN_OFFICER"]);
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
