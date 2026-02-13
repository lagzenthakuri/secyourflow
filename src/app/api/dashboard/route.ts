import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cachedJsonResponse, errorResponse, CACHE_STRATEGIES } from '@/lib/api-response';
import {
    clearDatabaseUnavailable,
    isDatabaseUnavailableError,
    isDatabaseUnavailableInCooldown,
    markDatabaseUnavailable,
} from "@/lib/database-availability";

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

function buildFallbackDashboardData() {
    const now = new Date();
    const riskTrends = Array.from({ length: 6 }, (_, index) => {
        const pointDate = new Date(now);
        pointDate.setDate(pointDate.getDate() - (5 - index) * 7);

        return {
            date: pointDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            riskScore: 0,
            criticalVulns: 0,
            highVulns: 0,
        };
    });

    return {
        stats: {
            totalAssets: 0,
            criticalAssets: 0,
            totalVulnerabilities: 0,
            criticalVulnerabilities: 0,
            highVulnerabilities: 0,
            mediumVulnerabilities: 0,
            lowVulnerabilities: 0,
            exploitedVulnerabilities: 0,
            cisaKevCount: 0,
            openVulnerabilities: 0,
            threatIndicatorCount: 0,
            overallRiskScore: 0,
            complianceScore: 0,
            fixedThisMonth: 0,
            meanTimeToRemediate: 0,
        },
        riskTrends,
        severityDistribution: [
            { severity: "CRITICAL", count: 0, percentage: 0 },
            { severity: "HIGH", count: 0, percentage: 0 },
            { severity: "MEDIUM", count: 0, percentage: 0 },
            { severity: "LOW", count: 0, percentage: 0 },
        ],
        topRiskyAssets: [],
        recentActivities: [],
        exploitedVulnerabilities: [],
        complianceOverview: [],
        remediationTrends: riskTrends.map((point) => ({
            month: point.date.split(" ")[0] ?? point.date,
            opened: 0,
            closed: 0,
            net: 0,
        })),
        assetTypeDistribution: [],
        degraded: true,
        lastUpdated: now.toISOString(),
    };
}

export async function GET() {
    try {
        const session = await auth();
        const isMainOfficer = session?.user?.role === "MAIN_OFFICER";

        if (isDatabaseUnavailableInCooldown()) {
            return cachedJsonResponse(buildFallbackDashboardData(), CACHE_STRATEGIES.DASHBOARD);
        }

        // OPTIMIZATION 1: Single query for all counts (replaces 11 queries)
        const [stats] = await prisma.$queryRaw<DashboardStats[]>`
            SELECT 
                (SELECT COUNT(*) FROM "Asset") as total_assets,
                (SELECT COUNT(*) FROM "Asset" WHERE criticality = 'CRITICAL') as critical_assets,
                (SELECT COUNT(*) FROM "Vulnerability") as total_vulnerabilities,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'CRITICAL') as critical_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'HIGH') as high_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'MEDIUM') as medium_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE severity = 'LOW') as low_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE "isExploited" = true) as exploited_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE "cisaKev" = true) as kev_vulns,
                (SELECT COUNT(*) FROM "Vulnerability" WHERE status = 'OPEN') as open_vulns,
                (SELECT COUNT(*) FROM "ThreatIndicator") as threat_indicators
        `;

        // OPTIMIZATION 2: Parallel fetch remaining data (6 queries instead of 17)
        const [
            recentActivities,
            topRiskyAssets,
            severityDistribution,
            assetTypeDistribution,
            riskSnapshots,
            complianceFrameworks
        ] = await Promise.all([
            isMainOfficer
                ? prisma.auditLog.findMany({
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
                })
                : Promise.resolve([]),

            prisma.asset.findMany({
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
                by: ['severity'],
                _count: { _all: true }
            }),

            prisma.asset.groupBy({
                by: ['type'],
                _count: { _all: true }
            }),

            prisma.riskSnapshot.findMany({
                take: 6,
                orderBy: { date: 'desc' },
                select: {
                    date: true,
                    overallRiskScore: true,
                    criticalVulns: true,
                    highVulns: true,
                    complianceScore: true
                }
            }),

            prisma.complianceFramework.findMany({
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

        // OPTIMIZATION 3: Use aggregated data from riskSnapshots instead of calculating
        const remediationTrends = riskSnapshots.reverse().map(snapshot => ({
            month: new Date(snapshot.date).toLocaleDateString('en-US', { month: 'short' }),
            opened: snapshot.criticalVulns + snapshot.highVulns,
            closed: 0, // Calculate from snapshot deltas if needed
            net: 0
        }));

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
                overallRiskScore: riskSnapshots[0]?.overallRiskScore || 0,
                complianceScore: riskSnapshots[0]?.complianceScore || 0,
                fixedThisMonth: 0, // Calculate from snapshots
                meanTimeToRemediate: 0,
            },
            riskTrends: riskSnapshots.length > 0 ? riskSnapshots.map(s => ({
                date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                riskScore: s.overallRiskScore,
                criticalVulns: s.criticalVulns,
                highVulns: s.highVulns,
            })) : Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (5 - i) * 7);
                return {
                    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    riskScore: 0,
                    criticalVulns: 0,
                    highVulns: 0,
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
        clearDatabaseUnavailable();
        return cachedJsonResponse(dashboardData, CACHE_STRATEGIES.DASHBOARD);
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.warn("Dashboard API: Database unavailable, serving fallback data.");
            }
            return cachedJsonResponse(buildFallbackDashboardData(), CACHE_STRATEGIES.DASHBOARD);
        }

        console.error('Dashboard API Error:', error);
        return errorResponse('Failed to fetch dashboard data', {
            status: 500,
            details: error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) }
        });
    }
}
