import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");
        const page = parseInt(searchParams.get("page") || "1");
        const entityType = searchParams.get("entityType");
        const userId = searchParams.get("userId");

        const where: any = {};
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
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }
}
