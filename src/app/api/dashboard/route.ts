import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
            assetTypeDistribution,
            riskSnapshots,
            complianceFrameworks
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

            // Top Risky Assets
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

            // Asset Type Distribution
            prisma.asset.groupBy({
                by: ['type'],
                _count: { _all: true }
            }),

            // Risk Trend
            prisma.riskSnapshot.findMany({
                take: 6,
                orderBy: { date: 'asc' }
            }),

            // Compliance Overview
            prisma.complianceFramework.findMany({
                take: 3,
                include: {
                    controls: true
                }
            })
        ]);

        // Remediation Trends (calculating from actual data)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const vulnsByMonth = await prisma.vulnerability.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true, status: true, fixedAt: true }
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const remediationTrends = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const month = d.getMonth();
            const year = d.getFullYear();

            const opened = vulnsByMonth.filter(v =>
                v.createdAt.getMonth() === month && v.createdAt.getFullYear() === year
            ).length;

            const closed = vulnsByMonth.filter(v =>
                v.fixedAt && v.fixedAt.getMonth() === month && v.fixedAt.getFullYear() === year
            ).length;

            return {
                month: monthNames[month],
                opened,
                closed,
                net: closed - opened
            };
        });

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
                fixedThisMonth: vulnsByMonth.filter(v =>
                    v.fixedAt && v.fixedAt.getMonth() === new Date().getMonth() && v.fixedAt.getFullYear() === new Date().getFullYear()
                ).length,
                meanTimeToRemediate: 0, // Set to 0 since no data exists yet
            },
            riskTrends: riskSnapshots.length > 0 ? riskSnapshots.map((s: any) => ({
                date: s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
            severityDistribution: severityDistribution.length > 0 ? severityDistribution.map((s: any) => ({
                severity: s.severity,
                count: s._count._all,
                percentage: totalVulnerabilities > 0 ? (s._count._all / totalVulnerabilities) * 100 : 0
            })) : [
                { severity: 'CRITICAL', count: 0, percentage: 0 },
                { severity: 'HIGH', count: 0, percentage: 0 },
                { severity: 'MEDIUM', count: 0, percentage: 0 },
                { severity: 'LOW', count: 0, percentage: 0 },
            ],
            topRiskyAssets: topRiskyAssets.map((a: any) => ({
                id: a.id,
                name: a.name,
                type: a.type,
                criticality: a.criticality,
                vulnerabilityCount: a._count.vulnerabilities,
                criticalVulnCount: 0, // Needs real calculation based on joined table
                riskScore: 0
            })),
            recentActivities: recentActivities.map((a: any) => ({
                id: a.id,
                action: a.action,
                entityType: a.entityType,
                entityName: a.entityId,
                userName: a.user?.name || 'System',
                timestamp: a.createdAt,
            })),
            exploitedVulnerabilities: await prisma.vulnerability.findMany({
                where: { isExploited: true },
                take: 5
            }),
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
            assetTypeDistribution: assetTypeDistribution.map((a: any) => ({
                type: a.type,
                count: a._count._all,
                percentage: totalAssets > 0 ? (a._count._all / totalAssets) * 100 : 0
            })),
            lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
