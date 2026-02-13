import { NextRequest, NextResponse } from "next/server";
import { Role, VulnSource } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

const createScannerSchema = z.object({
    name: z.string().trim().min(1).max(120),
    type: z.nativeEnum(VulnSource),
    endpoint: z.string().trim().max(500).optional().nullable(),
    apiKey: z.string().trim().max(2000).optional().nullable(),
    username: z.string().trim().max(120).optional().nullable(),
    password: z.string().trim().max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
    syncInterval: z.number().int().min(300).max(604800).optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const requestedLimit = parseInt(request.nextUrl.searchParams.get("limit") || "100", 10);
        const limit = Math.min(100, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 100));

        const scanners = await prisma.scannerConfig.findMany({
            where: {
                organizationId: authResult.context.organizationId,
            },
            select: {
                id: true,
                name: true,
                type: true,
                isActive: true,
                lastSync: true,
                syncInterval: true,
                scanResults: {
                    where: {
                        organizationId: authResult.context.organizationId,
                    },
                    orderBy: { startTime: 'desc' },
                    take: 1,
                    select: {
                        totalHosts: true,
                        totalVulns: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        const formattedScanners = scanners.map(scanner => ({
            id: scanner.id,
            name: scanner.name,
            type: scanner.type,
            status: scanner.isActive ? 'active' : 'inactive',
            lastSync: scanner.lastSync?.toISOString() || null,
            syncInterval: getSyncIntervalLabel(scanner.syncInterval),
            assetsScanned: scanner.scanResults[0]?.totalHosts || 0,
            vulnsFound: scanner.scanResults[0]?.totalVulns || 0,
        }));

        return NextResponse.json(formattedScanners);
    } catch {
        console.error("Scanners GET Error");
        return NextResponse.json(
            { error: "Failed to fetch scanners" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER, Role.IT_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const parsed = createScannerSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid scanner payload" }, { status: 400 });
        }
        const body = parsed.data;

        const newScanner = await prisma.scannerConfig.create({
            data: {
                name: body.name,
                type: body.type,
                endpoint: body.endpoint ?? null,
                apiKey: body.apiKey ?? null,
                username: body.username ?? null,
                password: body.password ?? null,
                isActive: body.isActive ?? true,
                syncInterval: body.syncInterval || 86400, // Default: daily
                organizationId: authResult.context.organizationId,
            },
        });

        return NextResponse.json(
            {
                id: newScanner.id,
                name: newScanner.name,
                type: newScanner.type,
                endpoint: newScanner.endpoint,
                username: newScanner.username,
                isActive: newScanner.isActive,
                syncInterval: newScanner.syncInterval,
                lastSync: newScanner.lastSync,
                createdAt: newScanner.createdAt,
                updatedAt: newScanner.updatedAt,
            },
            { status: 201 },
        );
    } catch {
        console.error("Scanners POST Error");
        return NextResponse.json(
            { error: "Failed to create scanner" },
            { status: 400 }
        );
    }
}

function getSyncIntervalLabel(seconds: number): string {
    if (seconds < 3600) return "Hourly";
    if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)} hours`;
    if (seconds === 86400) return "Daily";
    return `Every ${Math.floor(seconds / 86400)} days`;
}
