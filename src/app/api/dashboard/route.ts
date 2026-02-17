import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    clearDatabaseUnavailable,
    isDatabaseUnavailableError,
    isDatabaseUnavailableInCooldown,
    markDatabaseUnavailable,
} from "@/lib/database-availability";

export const revalidate = 0;

function noStoreJson(payload: unknown, status = 200) {
    const response = NextResponse.json(payload, { status });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
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

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const organizationId = authResult.context.organizationId;
        const isMainOfficer = authResult.context.role === "MAIN_OFFICER";

        if (isDatabaseUnavailableInCooldown()) {
            return noStoreJson(buildFallbackDashboardData());
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalAssets,
            criticalAssets,
            totalVulnerabilities,
            criticalVulnerabilities,
            highVulnerabilities,
            mediumVulnerabilities,
            lowVulnerabilities,
            exploitedVulnerabilityCount,
            cisaKevCount,
            openVulnerabilities,
            threatIndicatorCount,
            recentActivities,
            topRiskyAssets,
            severityDistribution,
            assetTypeDistribution,
            riskSnapshots,
            complianceFrameworks,
            fixedThisMonth,
            remediatedVulns,
            exploitedVulnerabilities,
        ] = await Promise.all([
            prisma.asset.count({ where: { organizationId } }),
            prisma.asset.count({ where: { organizationId, criticality: "CRITICAL" } }),
            prisma.vulnerability.count({ where: { organizationId } }),
            prisma.vulnerability.count({ where: { organizationId, severity: "CRITICAL" } }),
            prisma.vulnerability.count({ where: { organizationId, severity: "HIGH" } }),
            prisma.vulnerability.count({ where: { organizationId, severity: "MEDIUM" } }),
            prisma.vulnerability.count({ where: { organizationId, severity: "LOW" } }),
            prisma.vulnerability.count({ where: { organizationId, isExploited: true } }),
            prisma.vulnerability.count({ where: { organizationId, cisaKev: true } }),
            prisma.vulnerability.count({ where: { organizationId, status: "OPEN" } }),
            prisma.threatIndicator.count({ where: { organizationId } }),
            isMainOfficer
                ? prisma.auditLog.findMany({
                    where: { organizationId },
                    take: 6,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        action: true,
                        entityType: true,
                        entityId: true,
                        createdAt: true,
                        user: { select: { name: true } },
                    },
                })
                : Promise.resolve([]),
            prisma.asset.findMany({
                where: { organizationId },
                take: 5,
                orderBy: { vulnerabilities: { _count: "desc" } },
                select: {
                    id: true,
                    name: true,
                    type: true,
                    criticality: true,
                    _count: { select: { vulnerabilities: true } },
                },
            }),
            prisma.vulnerability.groupBy({
                by: ["severity"],
                where: { organizationId },
                _count: { _all: true },
            }),
            prisma.asset.groupBy({
                by: ["type"],
                where: { organizationId },
                _count: { _all: true },
            }),
            prisma.riskSnapshot.findMany({
                where: { organizationId },
                take: 6,
                orderBy: { date: "desc" },
                select: {
                    date: true,
                    overallRiskScore: true,
                    criticalVulns: true,
                    highVulns: true,
                    complianceScore: true,
                },
            }),
            prisma.complianceFramework.findMany({
                where: { organizationId },
                take: 3,
                select: {
                    id: true,
                    name: true,
                    controls: {
                        select: {
                            id: true,
                            status: true,
                        },
                    },
                },
            }),
            prisma.vulnerability.count({
                where: {
                    organizationId,
                    status: "FIXED",
                    fixedAt: { gte: startOfMonth },
                },
            }),
            prisma.vulnerability.findMany({
                where: {
                    organizationId,
                    status: "FIXED",
                    fixedAt: { not: null },
                },
                select: { createdAt: true, fixedAt: true },
                take: 50,
            }),
            prisma.vulnerability.findMany({
                where: {
                    organizationId,
                    OR: [{ isExploited: true }, { cisaKev: true }],
                    status: "OPEN",
                },
                take: 6,
                orderBy: { epssScore: "desc" },
                select: {
                    id: true,
                    cveId: true,
                    title: true,
                    severity: true,
                    epssScore: true,
                    cisaKev: true,
                },
            }),
        ]);

        // Calculate MTTR
        let meanTimeToRemediate = 0;
        if (remediatedVulns.length > 0) {
            const totalMs = remediatedVulns.reduce((acc, v) => {
                const diff = new Date(v.fixedAt!).getTime() - new Date(v.createdAt).getTime();
                return acc + diff;
            }, 0);
            const avgDays = totalMs / (1000 * 60 * 60 * 24 * remediatedVulns.length);
            meanTimeToRemediate = Math.round(avgDays);
        }

        const remediationTrends = [...riskSnapshots].reverse().map((snapshot) => ({
            month: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short" }),
            opened: snapshot.criticalVulns + snapshot.highVulns,
            closed: 0,
            net: 0,
        }));

        const dashboardData = {
            stats: {
                totalAssets,
                criticalAssets,
                totalVulnerabilities,
                criticalVulnerabilities,
                highVulnerabilities,
                mediumVulnerabilities,
                lowVulnerabilities,
                exploitedVulnerabilities: exploitedVulnerabilityCount,
                cisaKevCount,
                openVulnerabilities,
                threatIndicatorCount,
                overallRiskScore: riskSnapshots[0]?.overallRiskScore || 0,
                complianceScore: riskSnapshots[0]?.complianceScore || 0,
                fixedThisMonth,
                meanTimeToRemediate,
            },
            riskTrends:
                riskSnapshots.length > 0
                    ? riskSnapshots.map((snapshot) => ({
                        date: new Date(snapshot.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        riskScore: snapshot.overallRiskScore,
                        criticalVulns: snapshot.criticalVulns,
                        highVulns: snapshot.highVulns,
                    }))
                    : buildFallbackDashboardData().riskTrends,
            severityDistribution:
                severityDistribution.length > 0
                    ? severityDistribution.map((entry) => ({
                        severity: entry.severity,
                        count: entry._count._all,
                        percentage: totalVulnerabilities > 0 ? (entry._count._all / totalVulnerabilities) * 100 : 0,
                    }))
                    : buildFallbackDashboardData().severityDistribution,
            topRiskyAssets: await Promise.all(topRiskyAssets.map(async (asset) => {
                const criticalCount = await prisma.vulnerability.count({
                    where: {
                        organizationId,
                        assets: { some: { assetId: asset.id } },
                        severity: "CRITICAL",
                        status: "OPEN",
                    }
                });
                return {
                    id: asset.id,
                    name: asset.name,
                    type: asset.type,
                    criticality: asset.criticality,
                    vulnerabilityCount: asset._count.vulnerabilities,
                    criticalVulnCount: criticalCount,
                    riskScore: (criticalCount * 10) + (asset._count.vulnerabilities * 1), // Simple calculation for now
                };
            })),
            recentActivities: recentActivities.map((activity) => ({
                id: activity.id,
                action: activity.action,
                entityType: activity.entityType,
                entityName: activity.entityId,
                userName: activity.user?.name || "System",
                timestamp: activity.createdAt,
            })),
            exploitedVulnerabilities: exploitedVulnerabilities.map(v => ({
                id: v.id,
                cveId: v.cveId,
                title: v.title,
                severity: v.severity,
                epssScore: v.epssScore,
                cisaKev: v.cisaKev,
            })),
            complianceOverview: complianceFrameworks.map((framework) => {
                const total = framework.controls.length;
                const compliant = framework.controls.filter((control) => control.status === "COMPLIANT").length;
                const nonCompliant = framework.controls.filter((control) => control.status === "NON_COMPLIANT").length;
                return {
                    frameworkId: framework.id,
                    frameworkName: framework.name,
                    compliant,
                    nonCompliant,
                    compliancePercentage: total > 0 ? (compliant / total) * 100 : 0,
                };
            }),
            remediationTrends: await Promise.all(Array.from({ length: 6 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
                const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

                return Promise.all([
                    prisma.vulnerability.count({
                        where: { organizationId, createdAt: { gte: monthStart, lte: monthEnd } }
                    }),
                    prisma.vulnerability.count({
                        where: { organizationId, fixedAt: { gte: monthStart, lte: monthEnd }, status: "FIXED" }
                    })
                ]).then(([opened, closed]) => ({
                    month: d.toLocaleDateString("en-US", { month: "short" }),
                    opened,
                    closed,
                    net: opened - closed
                }));
            })),
            assetTypeDistribution: assetTypeDistribution.map((entry) => ({
                type: entry.type,
                count: entry._count._all,
                percentage: totalAssets > 0 ? (entry._count._all / totalAssets) * 100 : 0,
            })),
            lastUpdated: new Date().toISOString(),
        };

        clearDatabaseUnavailable();
        return noStoreJson(dashboardData);
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            if (markDatabaseUnavailable()) {
                console.warn("Dashboard API: Database unavailable, serving fallback data.");
            }
            return noStoreJson(buildFallbackDashboardData());
        }

        console.error("Dashboard API Error:", error);
        return noStoreJson({ error: "Failed to fetch dashboard data" }, 500);
    }
}
