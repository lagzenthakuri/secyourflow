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
    requestContext?: RequestContext
) {
    try {
        let userId = customUserId;
        let session = null;

        if (!userId) {
            // 1. Try to get from session
            session = await auth();
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

        // 3. Last resort fallback
        if (!userId) {
            // Find a specific admin (Lagzen) or any MAIN_OFFICER
            const admin = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: 'thakurizen2@gmail.com' },
                        { role: 'MAIN_OFFICER' }
                    ]
                },
                orderBy: { createdAt: 'desc' } // Prefer newer if multiple
            });
            userId = admin?.id;

            if (userId) {
                console.warn(`[Logger] Action "${action}" (${entityId}) was unattributed and fell back to admin ${admin?.email}`);
            }
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
                ipAddress: requestContext?.ipAddress || null,
                userAgent: requestContext?.userAgent || null,
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}
