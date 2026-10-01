import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, authorize } = vi.hoisted(() => ({
  authorize: vi.fn(),
  database: {
    asset: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    vulnerability: { groupBy: vi.fn() },
    threatIndicator: { count: vi.fn() },
    auditLog: { findMany: vi.fn() },
    riskSnapshot: { findMany: vi.fn() },
    complianceFramework: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: database }));
vi.mock("@/lib/api-auth", () => ({ requireSessionWithOrg: authorize }));

import { GET } from "@/app/api/dashboard/route";
import { clearDatabaseUnavailable } from "@/lib/database-availability";

beforeEach(() => {
  vi.resetAllMocks();
  clearDatabaseUnavailable();
  authorize.mockResolvedValue({
    ok: true,
    context: { organizationId: "org-a", role: "ANALYST" },
  });
  database.asset.count.mockResolvedValue(0);
  database.asset.findMany.mockResolvedValue([]);
  database.asset.groupBy.mockResolvedValue([]);
  database.threatIndicator.count.mockResolvedValue(0);
  database.riskSnapshot.findMany.mockResolvedValue([]);
  database.complianceFramework.findMany.mockResolvedValue([]);
});

describe("dashboard grouped vulnerability totals", () => {
  it("combines severity groups across status and exploitation without double counting", async () => {
    database.vulnerability.groupBy.mockResolvedValue([
      {
        severity: "CRITICAL",
        status: "OPEN",
        isExploited: true,
        cisaKev: true,
        _count: { _all: 2 },
      },
      {
        severity: "CRITICAL",
        status: "FIXED",
        isExploited: false,
        cisaKev: true,
        _count: { _all: 3 },
      },
      {
        severity: "HIGH",
        status: "OPEN",
        isExploited: false,
        cisaKev: false,
        _count: { _all: 4 },
      },
      {
        severity: "INFORMATIONAL",
        status: "ACCEPTED",
        isExploited: true,
        cisaKev: false,
        _count: { _all: 1 },
      },
    ]);
    const response = await GET(
      new NextRequest("http://localhost/api/dashboard?organizationId=org-b")
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.stats).toMatchObject({
      totalVulnerabilities: 10,
      criticalVulnerabilities: 5,
      highVulnerabilities: 4,
      mediumVulnerabilities: 0,
      lowVulnerabilities: 0,
      exploitedVulnerabilities: 3,
      cisaKevCount: 5,
      openVulnerabilities: 6,
    });
    expect(data.severityDistribution).toEqual([
      { severity: "CRITICAL", count: 5, percentage: 50 },
      { severity: "HIGH", count: 4, percentage: 40 },
      { severity: "INFORMATIONAL", count: 1, percentage: 10 },
    ]);
    expect(database.vulnerability.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a" } })
    );
    expect(database.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("returns zero totals for an empty workspace", async () => {
    database.vulnerability.groupBy.mockResolvedValue([]);
    const response = await GET(
      new NextRequest("http://localhost/api/dashboard")
    );
    const data = await response.json();
    expect(data.stats.totalVulnerabilities).toBe(0);
    expect(
      data.severityDistribution.every(
        (entry: { count: number; percentage: number }) =>
          entry.count === 0 && entry.percentage === 0
      )
    ).toBe(true);
    expect(data.degraded).toBeUndefined();
  });
});
