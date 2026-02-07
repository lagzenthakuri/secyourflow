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
        const session = await auth();
        // If system action, use a placeholder or system user ID if available
        // For now, we fallback to finding the first MAIN_OFFICER if no session (e.g. system jobs)
        // or just store 'SYSTEM' if schema allows string for userId (Schema says User relation, so need a real user)

        let userId = customUserId || session?.user?.id;

        if (!userId) {
            // Find a system user or admin to attribute to
            const admin = await prisma.user.findFirst({
                where: { role: 'MAIN_OFFICER' }
            });
            userId = admin?.id;
        }

        if (!userId) {
            console.warn("Could not attribute audit log to a user:", action);
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
