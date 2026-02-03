import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Severity, VulnStatus, VulnSource } from "@prisma/client";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const isExploited = searchParams.get("exploited");
    const cisaKev = searchParams.get("kev");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    try {
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const where: any = { organizationId: org.id };

        if (severity) where.severity = severity as Severity;
        if (status) where.status = status as VulnStatus;
        if (isExploited === "true") where.isExploited = true;
        if (cisaKev === "true") where.cisaKev = true;
        if (source) where.source = source as VulnSource;

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { cveId: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [vulns, total, severityDistribution, sourceDistribution] = await Promise.all([
            prisma.vulnerability.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: { assets: true }
                    }
                }
            }),
            prisma.vulnerability.count({ where }),
            prisma.vulnerability.groupBy({
                by: ['severity'],
                where: { organizationId: org.id },
                _count: { _all: true }
            }),
            prisma.vulnerability.groupBy({
                by: ['source'],
                where: { organizationId: org.id },
                _count: { _all: true }
            })
        ]);

        const formattedVulns = vulns.map(v => ({
            ...v,
            affectedAssets: v._count.assets,
        }));

        const severityDist = severityDistribution.map(s => ({
            severity: s.severity,
            count: s._count._all
        }));

        const sourceDist = sourceDistribution.map(s => ({
            source: s.source,
            count: s._count._all
        }));

        return NextResponse.json({
            data: formattedVulns,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                severityDistribution: severityDist,
                sourceDistribution: sourceDist
            }
        });
    } catch (error) {
        console.error("Vulnerabilities API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch vulnerabilities" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { assetId, ...vulnData } = await request.json();

        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const newVuln = await prisma.vulnerability.create({
            data: {
                ...vulnData,
                organizationId: org.id,
                source: vulnData.source || "MANUAL",
                status: vulnData.status || "OPEN",
                firstDetected: new Date(),
                lastSeen: new Date(),
                ...(assetId ? {
                    assets: {
                        create: {
                            assetId: assetId,
                            status: "OPEN"
                        }
                    }
                } : {})
            },
        });

        return NextResponse.json(newVuln, { status: 201 });
    } catch (error) {
        console.error("Create Vulnerability Error:", error);
        return NextResponse.json(
            { error: "Failed to create vulnerability" },
            { status: 400 }
        );
    }
}
