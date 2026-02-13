import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET() {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: authResult.context.userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: authResult.context.userId,
                isRead: false,
            },
        });

        const normalizedNotifications = notifications.map((notification) => ({
            ...notification,
            read: notification.isRead,
        }));

        return NextResponse.json({ notifications: normalizedNotifications, unreadCount });
    } catch {
        console.error("Notifications API Error");
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({ request });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = await request.json();
        const { title, message, type, link, userId } = body;
        if (typeof title !== "string" || !title.trim() || typeof message !== "string" || !message.trim()) {
            return NextResponse.json({ error: "title and message are required" }, { status: 400 });
        }

        let targetUserId = authResult.context.userId;
        if (typeof userId === "string" && userId.trim()) {
            if (userId !== authResult.context.userId && authResult.context.role !== Role.MAIN_OFFICER) {
                return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
            }
            targetUserId = userId;
        }

        if (targetUserId !== authResult.context.userId) {
            const targetUser = await prisma.user.findFirst({
                where: {
                    id: targetUserId,
                    organizationId: authResult.context.organizationId,
                },
                select: { id: true },
            });
            if (!targetUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
        }

        const notification = await prisma.notification.create({
            data: {
                userId: targetUserId,
                title: title.trim(),
                message: message.trim(),
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
            authResult.context.userId
        );

        return NextResponse.json(notification);

    } catch {
        console.error("Create Notification Error");
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await requireApiAuth({ request });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
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
                        userId: authResult.context.userId,
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
                where: { userId: authResult.context.userId, isRead: false },
                data: { isRead: true },
            });

            return NextResponse.json({ success: true, updated: updateResult.count });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    } catch {
        console.error("Update Notification Error");
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
