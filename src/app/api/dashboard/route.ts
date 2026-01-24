import { NextResponse } from "next/server";
import {
    mockDashboardStats,
    mockRiskTrends,
    mockSeverityDistribution,
    mockTopRiskyAssets,
    mockComplianceOverview,
    mockRecentActivities,
    mockExploitedVulnerabilities,
} from "@/lib/mock-data";

export async function GET() {
    // In production, this would query the database
    const dashboardData = {
        stats: mockDashboardStats,
        riskTrends: mockRiskTrends,
        severityDistribution: mockSeverityDistribution,
        topRiskyAssets: mockTopRiskyAssets,
        complianceOverview: mockComplianceOverview,
        recentActivities: mockRecentActivities,
        exploitedVulnerabilities: mockExploitedVulnerabilities,
        lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
}
