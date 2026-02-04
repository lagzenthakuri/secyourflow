import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Severity, VulnStatus, VulnSource } from "@prisma/client";
import { logActivity } from "@/lib/logger";
import { processRiskAssessment } from "@/lib/risk-engine";

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

        // --- Event Trigger: VULNERABILITY_CREATED ---

        // 1. Log the Activity
        await logActivity(
            "VULNERABILITY_CREATED",
            "Vulnerability",
            newVuln.id,
            null,
            { title: newVuln.title, severity: newVuln.severity, assetId },
            `Vulnerability detected: ${newVuln.title}`
        );

        // 2. Trigger Notifications
        // We notify all IT Officers and Main Officers about the new vulnerability
        try {
            const securityTeam = await prisma.user.findMany({
                where: {
                    role: { in: ['IT_OFFICER', 'MAIN_OFFICER', 'ANALYST'] },
                    organizationId: org.id
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
            processRiskAssessment(newVuln.id, assetId, org.id).catch(err =>
                console.error("Background Risk Assessment Validation Failed", err)
            );
        }

        return NextResponse.json(newVuln, { status: 201 });
    } catch (error) {
        console.error("Create Vulnerability Error:", error);
        return NextResponse.json(
            { error: "Failed to create vulnerability" },
            { status: 400 }
        );
    }
}
