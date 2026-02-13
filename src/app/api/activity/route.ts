import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
        const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));
        const rawPage = parseInt(searchParams.get("page") || "1", 10);
        const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
        const entityType = searchParams.get("entityType");
        const userId = searchParams.get("userId");

        if (userId && authResult.context.role !== Role.MAIN_OFFICER && userId !== authResult.context.userId) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const where = {
            ...(entityType ? { entityType } : {}),
            ...(userId ? { userId } : {}),
            user: {
                organizationId: authResult.context.organizationId,
            },
        };

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

        return NextResponse.json({
            logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            }
        });
    } catch {
        console.error("Activity API Error");
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }
}
