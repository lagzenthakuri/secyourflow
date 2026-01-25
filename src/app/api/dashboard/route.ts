import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const isDemo = searchParams.get("demo") === "true";

    // In a real app, we would also filter by the user's organizationId
    // For now, we'll fetch everything as a "global" view for this demo

    try {
        // Fetch stats
        const [
            totalAssets,
            criticalAssets,
            totalVulnerabilities,
            criticalVulnerabilities,
            highVulnerabilities,
            mediumVulnerabilities,
            lowVulnerabilities,
            exploitedVulnerabilitiesCount,
            cisaKevCount,
            openVulnerabilities,
            recentActivities,
            topRiskyAssets,
            severityDistribution,
            remediationTrends,
            assetTypeDistribution,
            riskSnapshots
        ] = await Promise.all([
            prisma.asset.count(),
            prisma.asset.count({ where: { criticality: 'CRITICAL' } }),
            prisma.vulnerability.count(),
            prisma.vulnerability.count({ where: { severity: 'CRITICAL' } }),
            prisma.vulnerability.count({ where: { severity: 'HIGH' } }),
            prisma.vulnerability.count({ where: { severity: 'MEDIUM' } }),
            prisma.vulnerability.count({ where: { severity: 'LOW' } }),
            prisma.vulnerability.count({ where: { isExploited: true } }),
            prisma.vulnerability.count({ where: { cisaKev: true } }),
            prisma.vulnerability.count({ where: { status: 'OPEN' } }),

            // Recent Activities
            prisma.auditLog.findMany({
                take: 6,
                orderBy: { createdAt: 'desc' },
                include: { user: true }
            }),

            // Top Risky Assets (simplified query)
            prisma.asset.findMany({
                take: 5,
                orderBy: { vulnerabilities: { _count: 'desc' } },
                include: {
                    _count: {
                        select: { vulnerabilities: true }
                    }
                }
            }),

            // Severity Distribution
            prisma.vulnerability.groupBy({
                by: ['severity'],
                _count: { _all: true }
            }),

            // Remediation Trends (mocking for now as it needs complex date grouping)
            Promise.resolve([
                { month: "Aug", opened: 12, closed: 8, net: -4 },
                { month: "Sep", opened: 15, closed: 12, net: -3 },
                { month: "Oct", opened: 20, closed: 18, net: -2 },
                { month: "Nov", opened: 18, closed: 22, net: 4 },
                { month: "Dec", opened: 25, closed: 20, net: -5 },
                { month: "Jan", opened: 10, closed: 15, net: 5 },
            ]),

            // Asset Type Distribution
            prisma.asset.groupBy({
                by: ['type'],
                _count: { _all: true }
            }),

            // Risk Trend
            prisma.riskSnapshot.findMany({
                take: 6,
                orderBy: { date: 'asc' }
            })
        ]);

        const dashboardData = {
            stats: {
                totalAssets,
                criticalAssets,
                totalVulnerabilities,
                criticalVulnerabilities,
                highVulnerabilities,
                mediumVulnerabilities,
                lowVulnerabilities,
                exploitedVulnerabilities: exploitedVulnerabilitiesCount,
                cisaKevCount,
                overallRiskScore: riskSnapshots[riskSnapshots.length - 1]?.overallRiskScore || 0,
                complianceScore: riskSnapshots[riskSnapshots.length - 1]?.complianceScore || 0,
                openVulnerabilities,
                fixedThisMonth: 5, // Mocked
                meanTimeToRemediate: 12.4, // Mocked
            },
            riskTrends: riskSnapshots.map((s: any) => ({
                date: s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                riskScore: s.overallRiskScore,
                criticalVulns: s.criticalVulns,
                highVulns: s.highVulns,
            })),
            severityDistribution: severityDistribution.map((s: any) => ({
                severity: s.severity,
                count: s._count._all,
                percentage: (s._count._all / totalVulnerabilities) * 100
            })),
            topRiskyAssets: topRiskyAssets.map((a: any) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                criticality: a.criticality,
                vulnerabilityCount: a._count.vulnerabilities,
                criticalVulnCount: Math.floor(a._count.vulnerabilities * 0.3), // Mock distribution
                riskScore: 60 + (a._count.vulnerabilities * 5) // Mock calculation
            })),
            complianceOverview: [
                {
                    frameworkId: "1",
                    frameworkName: "ISO 27001",
                    totalControls: 93,
                    compliant: 72,
                    nonCompliant: 8,
                    partiallyCompliant: 10,
                    notAssessed: 3,
                    compliancePercentage: 77.4,
                }
            ],
            recentActivities: recentActivities.map((a: any) => ({
                id: a.id,
                action: a.action,
                entityType: a.entityType,
                entityName: a.entityId, // In real app, join with entity
                userName: a.user.name,
                timestamp: a.createdAt,
            })),
            exploitedVulnerabilities: await prisma.vulnerability.findMany({
                where: { isExploited: true },
                take: 5
            }),
            remediationTrends,
            assetTypeDistribution: assetTypeDistribution.map((a: any) => ({
                type: a.type,
                count: a._count._all,
                percentage: (a._count._all / totalAssets) * 100
            })),
            lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
