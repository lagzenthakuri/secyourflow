import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                isRead: false
            }
        });

        return NextResponse.json({ notifications, unreadCount });
    } catch (error) {
        console.error("Notifications API Error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, message, type, link, userId } = body;

        const targetUserId = userId || session.user.id;

        const notification = await prisma.notification.create({
            data: {
                userId: targetUserId,
                title,
                message,
                type: type || "INFO",
                link
            }
        });

        await logActivity(
            "Notification created",
            "notification",
            notification.id,
            null,
            notification,
            `Notification sent to user ${targetUserId}: ${title}`
        );

        return NextResponse.json(notification);

    } catch (error) {
        console.error("Create Notification Error:", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, isRead, markAllRead } = body;

        if (id) {
            const notification = await prisma.notification.update({
                where: { id },
                data: { isRead: isRead !== undefined ? isRead : true }
            });
            return NextResponse.json(notification);
        }

        if (markAllRead) {
            await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    } catch (error) {
        console.error("Update Notification Error:", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
