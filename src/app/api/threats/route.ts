import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelQueryService } from "@/modules/threat-intel/query-service";
import { prisma } from "@/lib/prisma";
import {
  clearDatabaseUnavailable,
  isDatabaseUnavailableError,
  isDatabaseUnavailableInCooldown,
  markDatabaseUnavailable,
} from "@/lib/database-availability";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ThreatOverviewPayload {
  feeds: unknown[];
  indicators: unknown[];
  matches: unknown[];
  runs: unknown[];
  stats: {
    activeFeeds: number;
    totalIndicators: number;
    activeIndicators: number;
    criticalIndicators: number;
    matchedAssets: number;
    actorCount: number;
    campaignCount: number;
  };
}

function buildFallbackOverview(): ThreatOverviewPayload {
  return {
    feeds: [],
    indicators: [],
    matches: [],
    runs: [],
    stats: {
      activeFeeds: 0,
      totalIndicators: 0,
      activeIndicators: 0,
      criticalIndicators: 0,
      matchedAssets: 0,
      actorCount: 0,
      campaignCount: 0,
    },
  };
}

function buildThreatResponse(
  overview: ThreatOverviewPayload,
  type: string | undefined,
  degraded = false,
) {
  if (type === "feeds") {
    return NextResponse.json({ data: overview.feeds, degraded });
  }

  if (type === "indicators") {
    return NextResponse.json({ data: overview.indicators, degraded });
  }

  if (type === "matches") {
    return NextResponse.json({ data: overview.matches, degraded });
  }

  if (type === "runs") {
    return NextResponse.json({ data: overview.runs, degraded });
  }

  return NextResponse.json({
    ...overview,
    degraded,
    stats: {
      ...overview.stats,
      activeThreatsCount: overview.stats.activeIndicators,
      criticalThreats: overview.stats.criticalIndicators,
    },
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const type = searchParams.get("type")?.toLowerCase();

  try {
    const authResult = await requireThreatIntelContext(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const { organizationId } = authResult.context;

    if (isDatabaseUnavailableInCooldown()) {
      return buildThreatResponse(buildFallbackOverview(), type, true);
    }

    const service = new ThreatIntelQueryService();
    const overview = await service.getOverview(organizationId);
    clearDatabaseUnavailable();
    return buildThreatResponse(overview, type, false);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      if (markDatabaseUnavailable()) {
        console.warn("Threats API: Database unavailable, serving empty threat overview.");
      }
      return buildThreatResponse(buildFallbackOverview(), type, true);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch threats",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const authResult = await requireThreatIntelContext(request, { requireMainOfficer: true });
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId } = authResult.context;

  try {
    const deleted = await prisma.threatIndicator.deleteMany({
      where: {
        organizationId,
        source: "AI_RISK_ENGINE",
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deleted.count} AI threat indicators`,
      count: deleted.count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to delete threats",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
