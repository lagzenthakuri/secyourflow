import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    try {
        const [feeds, indicators] = await Promise.all([
            prisma.threatFeed.findMany({
                orderBy: { name: 'asc' }
            }),
            prisma.threatIndicator.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50
            })
        ]);

        const activeFeeds = feeds.filter((f) => f.isActive).length;
        const criticalThreats = indicators.filter((i) => i.severity === "CRITICAL").length;

        if (type === "feeds") {
            return NextResponse.json({ data: feeds });
        }

        if (type === "indicators") {
            return NextResponse.json({ data: indicators });
        }

        return NextResponse.json({
            feeds,
            indicators,
            stats: {
                activeFeeds,
                totalIndicators: indicators.length,
                criticalThreats,
            },
        });
    } catch (error) {
        console.error("Threats API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch threats" },
            { status: 500 }
        );
    }
}
