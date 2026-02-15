import { prisma } from "@/lib/prisma";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

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

export async function notifyMainOfficers(
    organizationId: string,
    title: string,
    message: string,
    link?: string,
) {
    try {
        const mainOfficers = await prisma.user.findMany({
            where: {
                role: "MAIN_OFFICER",
                organizationId,
            },
            select: { id: true }
        });

        const notifications = mainOfficers.map(officer => ({
            userId: officer.id,
            title,
            message,
            type: "INFO" as NotificationType,
            link
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications
            });
        }
    } catch (error) {
        console.error("Failed to notify main officers:", error);
    }
}
