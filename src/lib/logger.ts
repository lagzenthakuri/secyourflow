import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function logActivity(
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
    details?: string,
    customUserId?: string
) {
    try {
        let userId = customUserId;

        if (!userId) {
            const session = await auth();
            userId = session?.user?.id;
        }

        // For login/auth events, try to resolve user by email if userId is still missing.
        if (!userId && (entityType === 'auth' || action.toLowerCase().includes('login'))) {
            const email = entityId && entityId.includes('@') ? entityId : null;
            if (email) {
                const identifiedUser = await prisma.user.findUnique({
                    where: { email }
                });
                userId = identifiedUser?.id;
            }
        }

        if (!userId) {
            console.warn("[Logger] Could not attribute audit log to any user:", action, entityType, entityId);
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
