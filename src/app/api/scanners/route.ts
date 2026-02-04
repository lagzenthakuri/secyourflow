import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const scanners = await prisma.scannerConfig.findMany({
            include: {
                scanResults: {
                    orderBy: { startTime: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
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
    } catch (error) {
        console.error("Scanners GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch scanners" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const newScanner = await prisma.scannerConfig.create({
            data: {
                name: body.name,
                type: body.type,
                endpoint: body.endpoint,
                apiKey: body.apiKey,
                username: body.username,
                password: body.password,
                isActive: body.isActive ?? true,
                syncInterval: body.syncInterval || 86400, // Default: daily
            },
        });

        return NextResponse.json(newScanner, { status: 201 });
    } catch (error) {
        console.error("Scanners POST Error:", error);
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
