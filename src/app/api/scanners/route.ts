import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { encryptSecret } from "@/lib/crypto/sealed-secrets";

const createScannerSchema = z.object({
    name: z.string().min(2).max(200),
    type: z.enum(["NESSUS", "OPENVAS", "NMAP", "TRIVY", "QUALYS", "RAPID7", "CROWDSTRIKE", "MANUAL", "API", "OTHER", "TENABLE"]),
    endpoint: z.string().optional().nullable(),
    apiKey: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    syncInterval: z.number().int().min(300).max(604800).optional(),
});

function getSyncIntervalLabel(seconds: number): string {
    if (seconds < 3600) return "Hourly";
    if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)} hours`;
    if (seconds === 86400) return "Daily";
    return `Every ${Math.floor(seconds / 86400)} days`;
}

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const scanners = await prisma.scannerConfig.findMany({
            where: { organizationId: authResult.context.organizationId },
            include: {
                scanResults: {
                    where: { organizationId: authResult.context.organizationId },
                    orderBy: { startTime: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const formattedScanners = scanners.map((scanner) => ({
            id: scanner.id,
            name: scanner.name,
            type: scanner.type,
            status: scanner.isActive ? "active" : "inactive",
            lastSync: scanner.lastSync?.toISOString() || null,
            syncInterval: getSyncIntervalLabel(scanner.syncInterval),
            assetsScanned: scanner.scanResults[0]?.totalHosts || 0,
            vulnsFound: scanner.scanResults[0]?.totalVulns || 0,
            hasApiKey: Boolean(scanner.apiKey),
            hasUsername: Boolean(scanner.username),
            hasPassword: Boolean(scanner.password),
            endpoint: scanner.endpoint,
            isActive: scanner.isActive,
            createdAt: scanner.createdAt,
            updatedAt: scanner.updatedAt,
        }));

        return NextResponse.json(formattedScanners);
    } catch (error) {
        console.error("Scanners GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch scanners" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = createScannerSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid scanner payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const newScanner = await prisma.scannerConfig.create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                endpoint: parsed.data.endpoint || null,
                apiKey: encryptSecret(parsed.data.apiKey || null),
                username: encryptSecret(parsed.data.username || null),
                password: encryptSecret(parsed.data.password || null),
                isActive: parsed.data.isActive ?? true,
                syncInterval: parsed.data.syncInterval || 86400,
                organizationId: authResult.context.organizationId,
            },
        });

        return NextResponse.json(
            {
                id: newScanner.id,
                name: newScanner.name,
                type: newScanner.type,
                endpoint: newScanner.endpoint,
                isActive: newScanner.isActive,
                syncInterval: newScanner.syncInterval,
                lastSync: newScanner.lastSync,
                createdAt: newScanner.createdAt,
                updatedAt: newScanner.updatedAt,
                hasApiKey: Boolean(newScanner.apiKey),
                hasUsername: Boolean(newScanner.username),
                hasPassword: Boolean(newScanner.password),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Scanners POST Error:", error);
        return NextResponse.json({ error: "Failed to create scanner" }, { status: 400 });
    }
}
