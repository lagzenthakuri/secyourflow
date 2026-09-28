import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    clearDatabaseUnavailable,
    isDatabaseUnavailableError,
    isDatabaseUnavailableInCooldown,
    markDatabaseUnavailable,
} from "@/lib/database-availability";

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 200);
        const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
        const entityType = searchParams.get("entityType");
        const userId = searchParams.get("userId");

        const fallbackPayload = {
            logs: [],
            pagination: {
                total: 0,
                pages: 0,
                page,
                limit,
            },
            degraded: true,
        };

        if (isDatabaseUnavailableInCooldown()) {
            return NextResponse.json(fallbackPayload);
        }

        let filteredUserId: string | undefined;
        if (userId) {
            const targetUser = await prisma.user.findFirst({
                where: {
                    id: userId,
                    organizationId: authResult.context.organizationId,
                },
                select: { id: true },
            });

            if (!targetUser) {
                return NextResponse.json({ error: "Invalid user filter for this organization" }, { status: 400 });
            }
            filteredUserId = targetUser.id;
        }

        const where: {
            organizationId: string;
            entityType?: string;
            userId?: string;
        } = {
            organizationId: authResult.context.organizationId,
        };

        if (entityType) where.entityType = entityType;
        if (filteredUserId) where.userId = filteredUserId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true, image: true, role: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.auditLog.count({ where }),
        ]);

        clearDatabaseUnavailable();
        return NextResponse.json({
            logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit,
            },
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.warn("Activity API: Database unavailable, serving empty activity log list.");
            }

            const searchParams = request.nextUrl.searchParams;
            const limit = parseInt(searchParams.get("limit") || "20", 10);
            const page = parseInt(searchParams.get("page") || "1", 10);

            return NextResponse.json({
                logs: [],
                pagination: {
                    total: 0,
                    pages: 0,
                    page,
                    limit,
                },
                degraded: true,
            });
        }

        console.error("Activity API Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }
}
