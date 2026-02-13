import { NextRequest, NextResponse } from "next/server";
import { Role, Severity, VulnStatus, VulnSource } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireApiAuth } from "@/lib/security/api-auth";

const createVulnerabilitySchema = z.object({
    assetId: z.string().trim().optional(),
    cveId: z.string().trim().max(64).optional(),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(6000).optional(),
    severity: z.nativeEnum(Severity),
    cvssScore: z.number().min(0).max(10).optional(),
    cvssVector: z.string().trim().max(256).optional(),
    epssScore: z.number().min(0).max(1).optional(),
    cweId: z.string().trim().max(64).optional(),
    cisaKev: z.boolean().optional(),
    isExploited: z.boolean().optional(),
    patchAvailable: z.boolean().optional(),
    businessImpact: z.string().trim().max(2000).optional(),
    source: z.nativeEnum(VulnSource).optional(),
    status: z.nativeEnum(VulnStatus).optional(),
    references: z.array(z.string().trim().max(500)).optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const isExploited = searchParams.get("exploited");
    const cisaKev = searchParams.get("kev");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));

    try {
        const orgId = authResult.context.organizationId;
        const where: Record<string, unknown> = { organizationId: orgId };

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
                    },
                    riskEntries: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            }),
            prisma.vulnerability.count({ where }),
            prisma.vulnerability.groupBy({
                by: ['severity'],
                where: { organizationId: orgId },
                _count: { _all: true }
            }),
            prisma.vulnerability.groupBy({
                by: ['source'],
                where: { organizationId: orgId },
                _count: { _all: true }
            })
        ]);

        const formattedVulns = vulns.map((v) => ({
            ...v,
            affectedAssets: v._count?.assets || 0,
        }));

        const severityDist = severityDistribution.map(s => ({
            severity: s.severity,
            count: s._count._all
        }));

        const sourceDist = sourceDistribution.map(s => ({
            source: s.source,
            count: s._count._all
        }));

        // Calculate EPSS ranges manually from the count or via raw queries if needed, 
        // but since we want the whole organization, we can do a simplified count for each range.
        const epssDistribution = await Promise.all([
            prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.7 } } }),
            prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.3, lte: 0.7 } } }),
            prisma.vulnerability.count({ where: { ...where, epssScore: { gt: 0.1, lte: 0.3 } } }),
            prisma.vulnerability.count({ where: { ...where, epssScore: { lte: 0.1 } } }),
        ]);

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
                sourceDistribution: sourceDist,
                epssDistribution: {
                    high: epssDistribution[0],
                    medium: epssDistribution[1],
                    low: epssDistribution[2],
                    minimal: epssDistribution[3],
                }
            }
        });
    } catch {
        console.error("Vulnerabilities API Error");
        return NextResponse.json(
            { error: "Failed to fetch vulnerabilities" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const parsed = createVulnerabilitySchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid vulnerability payload" }, { status: 400 });
        }
        const { assetId, ...vulnData } = parsed.data;
        const orgId = authResult.context.organizationId;
        const userId = authResult.context.userId;

        if (assetId) {
            const asset = await prisma.asset.findFirst({
                where: {
                    id: assetId,
                    organizationId: orgId,
                },
                select: { id: true },
            });

            if (!asset) {
                return NextResponse.json({ error: "Asset not found" }, { status: 404 });
            }
        }

        const newVuln = await prisma.vulnerability.create({
            data: {
                ...vulnData,
                organizationId: orgId,
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

        // --- Event Trigger: VULNERABILITY_CREATED ---

        // 1. Log the Activity
        await logActivity(
            "VULNERABILITY_CREATED",
            "Vulnerability",
            newVuln.id,
            null,
            { title: newVuln.title, severity: newVuln.severity, assetId },
            `Vulnerability detected: ${newVuln.title}`,
            userId
        );

        // 2. Trigger Notifications
        // We notify all IT Officers and Main Officers about the new vulnerability
        try {
            const securityTeam = await prisma.user.findMany({
                where: {
                    role: { in: ['IT_OFFICER', 'MAIN_OFFICER', 'ANALYST'] },
                    organizationId: orgId
                },
                select: { id: true }
            });

            if (securityTeam.length > 0) {
                let assetName = "Unknown Asset";
                if (assetId) {
                    const asset = await prisma.asset.findUnique({
                        where: { id: assetId },
                        select: { name: true }
                    });
                    if (asset) assetName = asset.name;
                }

                await prisma.notification.createMany({
                    data: securityTeam.map(user => ({
                        userId: user.id,
                        title: "New Vulnerability Detected",
                        message: `A ${newVuln.severity} severity vulnerability '${newVuln.title}' was detected on ${assetName}.`,
                        type: "WARNING", // Use WARNING for vulnerabilities
                        link: `/vulnerabilities/${newVuln.id}`
                    }))
                });
            }
        } catch (notifyError) {
            console.error("Failed to trigger notifications:", notifyError);
            // Don't fail the request if notifications fail
        }

        // --- Event Trigger: RISK_CALCULATION ---
        // 3. Trigger AI Risk Engine Pipeline
        // We run this asynchronously (fire and forget for API response speed, but awaited here since we want to be sure it starts)
        // In production, this would go to a job queue.
        if (assetId) {
            processRiskAssessment(newVuln.id, assetId, orgId, userId).catch(err =>
                console.error("Background Risk Assessment Validation Failed", err)
            );
        }

        return NextResponse.json(newVuln, { status: 201 });
    } catch {
        console.error("Create Vulnerability Error");
        return NextResponse.json(
            { error: "Failed to create vulnerability" },
            { status: 400 }
        );
    }
}
