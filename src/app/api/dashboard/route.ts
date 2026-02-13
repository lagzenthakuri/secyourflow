import { prisma } from "@/lib/prisma";
import { cachedJsonResponse, errorResponse, CACHE_STRATEGIES } from '@/lib/api-response';
import { requireApiAuth } from "@/lib/security/api-auth";

// ISR: revalidate every 5 minutes
export const revalidate = 300;

interface DashboardStats {
  total_assets: bigint;
  critical_assets: bigint;
  total_vulnerabilities: bigint;
  critical_vulns: bigint;
  high_vulns: bigint;
  medium_vulns: bigint;
  low_vulns: bigint;
  exploited_vulns: bigint;
  kev_vulns: bigint;
  open_vulns: bigint;
  threat_indicators: bigint;
}

export async function GET() {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const orgId = authResult.context.organizationId;

        // OPTIMIZATION 1: Single query for all counts with organization filter
        const [stats] = await prisma.$queryRaw<DashboardStats[]>`
            SELECT 
                (SELECT COUNT(*) FROM "Asset" WHERE "organizationId" = ${orgId}) as total_assets,
                (SELECT COUNT(*) FROM "Asset" WHERE criticality = 'CRITICAL' AND "organizationId" = ${orgId}) as critical_assets,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE "organizationId" = ${orgId}) as total_vulnerabilities,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'CRITICAL' AND "organizationId" = ${orgId}) as critical_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'HIGH' AND "organizationId" = ${orgId}) as high_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'MEDIUM' AND "organizationId" = ${orgId}) as medium_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'LOW' AND "organizationId" = ${orgId}) as low_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE "isExploited" = true AND "organizationId" = ${orgId}) as exploited_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE "cisaKev" = true AND "organizationId" = ${orgId}) as kev_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE status = 'OPEN' AND "organizationId" = ${orgId}) as open_vulns,
                (SELECT COUNT(*) FROM "ThreatIndicator" WHERE "organizationId" = ${orgId}) as threat_indicators
        `;

        // OPTIMIZATION 2: Parallel fetch remaining data (6 queries instead of 17)
        const [
            recentActivities,
            topRiskyAssets,
            severityDistribution,
            assetTypeDistribution,
            complianceFrameworks
        ] = await Promise.all([
            prisma.auditLog.findMany({
                where: {
                    user: {
                        organizationId: orgId,
                    },
                },
                take: 6,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    createdAt: true,
                    user: { select: { name: true } }
                }
            }),
            
            prisma.asset.findMany({
                where: { organizationId: orgId },
                take: 5,
                orderBy: { vulnerabilities: { _count: 'desc' } },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    criticality: true,
                    _count: { select: { vulnerabilities: true } }
                }
            }),
            
            prisma.vulnerability.groupBy({
                where: { organizationId: orgId },
                by: ['severity'],
                _count: { _all: true }
            }),
            
            prisma.asset.groupBy({
                where: { organizationId: orgId },
                by: ['type'],
                _count: { _all: true }
            }),

            prisma.complianceFramework.findMany({
                where: { organizationId: orgId },
                take: 3,
                select: {
                    id: true,
                    name: true,
                    controls: {
                        select: {
                            id: true,
                            status: true
                        }
                    }
                }
            })
        ]);

        const compliantControls = complianceFrameworks.reduce(
            (sum, framework) => sum + framework.controls.filter((control) => control.status === "COMPLIANT").length,
            0,
        );
        const totalControls = complianceFrameworks.reduce((sum, framework) => sum + framework.controls.length, 0);
        const complianceScore = totalControls > 0 ? (compliantControls / totalControls) * 100 : 0;
        const overallRiskScore = Number(
            Math.min(
                100,
                Number(stats.critical_vulns) * 8 +
                    Number(stats.high_vulns) * 4 +
                    Number(stats.exploited_vulns) * 6 +
                    Number(stats.kev_vulns) * 6,
            ).toFixed(2),
        );
        const remediationTrends = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (5 - index) * 7);

            return {
                month: date.toLocaleDateString("en-US", { month: "short" }),
                opened: Number(stats.critical_vulns) + Number(stats.high_vulns),
                closed: 0,
                net: Number(stats.open_vulns),
            };
        });

        // Build response
        const dashboardData = {
            stats: {
                totalAssets: Number(stats.total_assets),
                criticalAssets: Number(stats.critical_assets),
                totalVulnerabilities: Number(stats.total_vulnerabilities),
                criticalVulnerabilities: Number(stats.critical_vulns),
                highVulnerabilities: Number(stats.high_vulns),
                mediumVulnerabilities: Number(stats.medium_vulns),
                lowVulnerabilities: Number(stats.low_vulns),
                exploitedVulnerabilities: Number(stats.exploited_vulns),
                cisaKevCount: Number(stats.kev_vulns),
                openVulnerabilities: Number(stats.open_vulns),
                threatIndicatorCount: Number(stats.threat_indicators),
                overallRiskScore,
                complianceScore,
                fixedThisMonth: 0,
                meanTimeToRemediate: 0,
            },
            riskTrends: Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (5 - i) * 7);
                return {
                    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    riskScore: overallRiskScore,
                    criticalVulns: Number(stats.critical_vulns),
                    highVulns: Number(stats.high_vulns),
                };
            }),
            severityDistribution: severityDistribution.length > 0 ? severityDistribution.map(s => ({
                severity: s.severity,
                count: s._count._all,
                percentage: Number(stats.total_vulnerabilities) > 0 
                    ? (s._count._all / Number(stats.total_vulnerabilities)) * 100 
                    : 0
            })) : [
                { severity: 'CRITICAL', count: 0, percentage: 0 },
                { severity: 'HIGH', count: 0, percentage: 0 },
                { severity: 'MEDIUM', count: 0, percentage: 0 },
                { severity: 'LOW', count: 0, percentage: 0 },
            ],
            topRiskyAssets: topRiskyAssets.map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                criticality: a.criticality,
                vulnerabilityCount: a._count.vulnerabilities,
                criticalVulnCount: 0,
                riskScore: 0
            })),
            recentActivities: recentActivities.map(a => ({
                id: a.id,
                action: a.action,
                entityType: a.entityType,
                entityName: a.entityId,
                userName: a.user?.name || 'System',
                timestamp: a.createdAt,
            })),
            exploitedVulnerabilities: [], // Fetch separately if needed
            complianceOverview: complianceFrameworks.map(f => {
                const total = f.controls.length;
                const compliant = f.controls.filter(c => c.status === 'COMPLIANT').length;
                const nonCompliant = f.controls.filter(c => c.status === 'NON_COMPLIANT').length;
                return {
                    frameworkId: f.id,
                    frameworkName: f.name,
                    compliant,
                    nonCompliant,
                    compliancePercentage: total > 0 ? (compliant / total) * 100 : 0
                };
            }),
            remediationTrends,
            assetTypeDistribution: assetTypeDistribution.map(a => ({
                type: a.type,
                count: a._count._all,
                percentage: Number(stats.total_assets) > 0 
                    ? (a._count._all / Number(stats.total_assets)) * 100 
                    : 0
            })),
            lastUpdated: new Date().toISOString(),
        };

        // OPTIMIZATION 4: Add caching headers
        return cachedJsonResponse(dashboardData, CACHE_STRATEGIES.PRIVATE);
    } catch {
        console.error('Dashboard API Error');
        // Don't expose internal error details
        return errorResponse('Failed to fetch dashboard data', {
            status: 500
        });
    }
}
