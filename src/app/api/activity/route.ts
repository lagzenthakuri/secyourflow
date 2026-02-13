import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import {
    clearDatabaseUnavailable,
    isDatabaseUnavailableError,
    isDatabaseUnavailableInCooldown,
    markDatabaseUnavailable,
} from "@/lib/database-availability";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        if (session.user.role !== "MAIN_OFFICER") {
            return NextResponse.json({ error: "Forbidden: MAIN_OFFICER role required" }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");
        const page = parseInt(searchParams.get("page") || "1");
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

        const where: Record<string, string> = {};
        if (entityType) where.entityType = entityType;
        if (userId) where.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true, image: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit
            }),
            prisma.auditLog.count({ where })
        ]);

        clearDatabaseUnavailable();
        return NextResponse.json({
            logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            }
        });
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.warn("Activity API: Database unavailable, serving empty activity log list.");
            }

            const searchParams = request.nextUrl.searchParams;
            const limit = parseInt(searchParams.get("limit") || "20");
            const page = parseInt(searchParams.get("page") || "1");

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
