import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { RequestContext } from "@/lib/request-utils";

export async function logActivity(
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
    details?: string,
    customUserId?: string,
    requestContext?: RequestContext,
    customOrganizationId?: string,
) {
    try {
        let userId = customUserId;

        if (!userId) {
            // 1. Try to get from session
            const session = await auth();
            userId = session?.user?.id;
        }

        // 2. For login/auth events, try to resolve user by email if userId is still missing
        if (!userId && (entityType === 'auth' || action.toLowerCase().includes('login'))) {
            const email = entityId && entityId.includes('@') ? entityId : null;
            if (email) {
                const identifiedUser = await prisma.user.findUnique({
                    where: { email }
                });
                userId = identifiedUser?.id;
            }
        }

        // 3. If still missing, skip logging instead of forcing incorrect attribution.
        if (!userId) {
            console.warn("[Logger] Could not attribute audit log to any user:", action);
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { organizationId: true },
        });

        const organizationId = customOrganizationId || user?.organizationId || null;
        if (!organizationId) {
            console.warn("[Logger] Could not resolve organization for audit log:", action);
            return;
        }

        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                userId,
                organizationId,
                oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
                newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
                ipAddress: requestContext?.ipAddress || null,
                userAgent: requestContext?.userAgent || null,
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}
