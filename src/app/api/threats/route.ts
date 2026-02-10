import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelQueryService } from "@/modules/threat-intel/query-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId } = authResult.context;
  const searchParams = new URL(request.url).searchParams;
  const type = searchParams.get("type")?.toLowerCase();

  try {
    const service = new ThreatIntelQueryService();
    const overview = await service.getOverview(organizationId);

    if (type === "feeds") {
      return NextResponse.json({ data: overview.feeds });
    }

    if (type === "indicators") {
      return NextResponse.json({ data: overview.indicators });
    }

    if (type === "matches") {
      return NextResponse.json({ data: overview.matches });
    }

    if (type === "runs") {
      return NextResponse.json({ data: overview.runs });
    }

    return NextResponse.json({
      ...overview,
      stats: {
        ...overview.stats,
        activeThreatsCount: overview.stats.activeIndicators,
        criticalThreats: overview.stats.criticalIndicators,
      },
    });
  } catch (error) {
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
