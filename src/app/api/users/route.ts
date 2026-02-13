import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET() {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER],
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const users = await prisma.user.findMany({
            where: { organizationId: authResult.context.organizationId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLogin: true,
                createdAt: true,
            },
        });

        const formattedUsers = users.map((user) => ({
            id: user.id,
            name: user.name || "Unknown User",
            email: user.email,
            role: user.role,
            department: "Security",
            lastActive: user.lastLogin ? getTimeAgo(new Date(user.lastLogin)) : "Never",
            status:
                user.lastLogin && Date.now() - new Date(user.lastLogin).getTime() < 5 * 60 * 1000
                    ? "online"
                    : "offline",
        }));

        return NextResponse.json(formattedUsers);
    } catch {
        console.error("Users API Error");
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = (await request.json()) as { userId?: string; role?: Role };
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!Object.values(Role).includes(role)) {
            return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
        }

        const currentUser = await prisma.user.findFirst({
            where: {
                id: userId,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true, role: true, email: true },
        });

        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (currentUser.role === Role.MAIN_OFFICER && role !== Role.MAIN_OFFICER) {
            const mainOfficerCount = await prisma.user.count({
                where: {
                    organizationId: authResult.context.organizationId,
                    role: Role.MAIN_OFFICER,
                },
            });

            if (mainOfficerCount <= 1) {
                return NextResponse.json(
                    { error: "At least one MAIN_OFFICER must remain in the organization" },
                    { status: 400 },
                );
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id },
            data: { role },
        });

        await logActivity(
            "Role updated",
            "user",
            updatedUser.email,
            { role: currentUser.role },
            { role },
            `Role changed from ${currentUser.role} to ${role}`,
            authResult.context.userId,
        );

        return NextResponse.json(updatedUser);
    } catch {
        console.error("Update User Error");
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
