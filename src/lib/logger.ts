import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function logActivity(
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: any,
    newValue?: any,
    details?: string,
    customUserId?: string
) {
    try {
        let userId = customUserId;
        let session = null;

        if (!userId) {
            session = await auth();
            userId = session?.user?.id;
        }

        if (!userId) {
            // Find a system user or admin to attribute to
            const admin = await prisma.user.findFirst({
                where: { role: 'MAIN_OFFICER' }
            });
            userId = admin?.id;
        }

        if (!userId) {
            console.warn("[Logger] Could not attribute audit log to any user:", action);
            return;
        }

        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                userId,
                oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
                newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
                ipAddress: "Unknown", // Can be enhanced by passing req
                userAgent: details || "System",
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}
