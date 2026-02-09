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

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                isRead: false,
            },
        });

        const normalizedNotifications = notifications.map((notification) => ({
            ...notification,
            read: notification.isRead,
        }));

        return NextResponse.json({ notifications: normalizedNotifications, unreadCount });
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
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
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
                link,
            },
        });

        await logActivity(
            "Notification created",
            "notification",
            notification.id,
            null,
            notification,
            `Notification sent to user ${targetUserId}: ${title}`,
            session.user.id
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
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        const body = await request.json();
        const { id, isRead, markAllRead } = body as {
            id?: string;
            isRead?: boolean;
            markAllRead?: boolean;
        };

        if (id) {
            const readState = isRead !== undefined ? Boolean(isRead) : true;

            const existingNotification = await prisma.notification.findFirst({
                where: {
                    id,
                    userId: session.user.id,
                },
            });

            if (!existingNotification) {
                return NextResponse.json({ error: "Notification not found" }, { status: 404 });
            }

            let updatedNotification = existingNotification;
            const changedToRead = readState && !existingNotification.isRead;

            if (existingNotification.isRead !== readState) {
                updatedNotification = await prisma.notification.update({
                    where: { id: existingNotification.id },
                    data: { isRead: readState },
                });
            }

            return NextResponse.json({
                notification: {
                    ...updatedNotification,
                    read: updatedNotification.isRead,
                },
                changedToRead,
            });
        }

        if (markAllRead) {
            const updateResult = await prisma.notification.updateMany({
                where: { userId: session.user.id, isRead: false },
                data: { isRead: true },
            });

            return NextResponse.json({ success: true, updated: updateResult.count });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    } catch (error) {
        console.error("Update Notification Error:", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
