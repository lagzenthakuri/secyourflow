import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export async function GET() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        // Ideally, we'd filter by organizationId if multi-tenant
        const org = await prisma.organization.findFirst();

        const users = await prisma.user.findMany({
            where: org ? { organizationId: org.id } : {},
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
        const session = await auth();
        // Check if user is authenticated and is MAIN_OFFICER
        if (!session || !session.user || session.user.role !== 'MAIN_OFFICER') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, email: true }
        });

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        await logActivity(
            "Role updated",
            "user",
            updatedUser.email,
            currentUser?.role ? { role: currentUser.role } : null,
            { role },
            `Role changed from ${currentUser?.role} to ${role} by ${session.user.name}`,
            session.user.id
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
