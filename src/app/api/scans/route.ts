import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER, Role.IT_OFFICER, Role.PENTESTER],
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { searchParams } = new URL(request.url);
        const requestedLimit = parseInt(searchParams.get("limit") || "10", 10);
        const limit = Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10));

        const scans = await prisma.scanResult.findMany({
            where: {
                organizationId: authResult.context.organizationId,
            },
            include: {
                scanner: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { startTime: 'desc' },
            take: limit
        });

        const formattedScans = scans.map(scan => ({
            id: scan.id,
            name: `${scan.scanner.name} Scan`,
            scanner: scan.scanner.name,
            status: scan.status.toLowerCase(),
            startTime: scan.startTime.toISOString(),
            duration: scan.endTime
                ? formatDuration(scan.endTime.getTime() - scan.startTime.getTime())
                : "In progress",
            hosts: scan.totalHosts,
            vulns: scan.totalVulns,
        }));

        return NextResponse.json(formattedScans);
    } catch {
        console.error("Scan Results GET Error");
        return NextResponse.json(
            { error: "Failed to fetch scan results" },
            { status: 500 }
        );
    }
}

function formatDuration(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
