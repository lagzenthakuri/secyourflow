import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

/** Roles that should hear about security events by default. */
const SECURITY_TEAM_ROLES: readonly Role[] = ["IT_OFFICER", "MAIN_OFFICER", "ANALYST"];

interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
    try {
        return await prisma.notification.create({
            data: {
                userId: input.userId,
                title: input.title,
                message: input.message,
                type: input.type || "INFO",
                link: input.link,
            },
        });
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
}

interface BroadcastInput {
    title: string;
    message: string;
    type?: NotificationType;
    link?: string;
}

/**
 * Fans a notification out to every user in an organization holding one of
 * `roles`. Single implementation for what used to be two near-identical
 * helpers in `lib/notifications.ts` and this file.
 */
async function notifyRoles(
    organizationId: string,
    roles: readonly Role[],
    notification: BroadcastInput,
): Promise<number> {
    try {
        const recipients = await prisma.user.findMany({
            where: { organizationId, role: { in: [...roles] } },
            select: { id: true },
        });

        if (recipients.length === 0) {
            return 0;
        }

        await prisma.notification.createMany({
            data: recipients.map((user) => ({
                userId: user.id,
                title: notification.title,
                message: notification.message,
                type: notification.type || "INFO",
                link: notification.link,
            })),
        });

        return recipients.length;
    } catch (error) {
        console.error("Failed to broadcast notification:", error);
        return 0;
    }
}

export function notifySecurityTeam(organizationId: string, notification: BroadcastInput) {
    return notifyRoles(organizationId, SECURITY_TEAM_ROLES, notification);
}

export function notifyMainOfficers(
    organizationId: string,
    title: string,
    message: string,
    link?: string,
) {
    return notifyRoles(organizationId, ["MAIN_OFFICER"], { title, message, link, type: "INFO" });
}
