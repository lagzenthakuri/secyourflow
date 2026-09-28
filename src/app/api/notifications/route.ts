import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { extractRequestContext } from "@/lib/request-utils";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    clearDatabaseUnavailable,
    isDatabaseUnavailableError,
    isDatabaseUnavailableInCooldown,
    markDatabaseUnavailable,
} from "@/lib/database-availability";

const createNotificationSchema = z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(5000),
    type: z.string().optional(),
    link: z.string().optional(),
    userId: z.string().optional(),
});

const patchNotificationSchema = z.object({
    id: z.string().optional(),
    isRead: z.boolean().optional(),
    markAllRead: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        if (isDatabaseUnavailableInCooldown()) {
            return NextResponse.json({ notifications: [], unreadCount: 0, degraded: true });
        }

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

        clearDatabaseUnavailable();
        return NextResponse.json({ notifications: normalizedNotifications, unreadCount });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.warn("Notifications API: Database unavailable, serving empty notification list.");
            }
            return NextResponse.json({ notifications: [], unreadCount: 0, degraded: true });
        }

        console.error("Notifications API Error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const ctx = extractRequestContext(request);
        const parsed = createNotificationSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid notification payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { title, message, type, link, userId } = parsed.data;
        const targetUserId = userId || authResult.context.userId;

        if (targetUserId !== authResult.context.userId && authResult.context.role !== "MAIN_OFFICER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const targetUser = await prisma.user.findFirst({
            where: {
                id: targetUserId,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!targetUser) {
            return NextResponse.json({ error: "Target user not found in your organization" }, { status: 404 });
        }

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
            {
                targetUserId,
                title,
                type: notification.type,
            },
            `Notification sent to user ${targetUserId}: ${title}`,
            authResult.context.userId,
            ctx,
            authResult.context.organizationId,
        );

        return NextResponse.json(notification);
    } catch (error) {
        console.error("Create Notification Error:", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = patchNotificationSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid request payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { id, isRead, markAllRead } = parsed.data;

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
    } catch (error) {
        console.error("Update Notification Error:", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
