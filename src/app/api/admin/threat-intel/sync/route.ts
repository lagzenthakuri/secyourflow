import { NextResponse } from "next/server";
import { ThreatIntelOrchestrator } from "@/modules/threat-intel/orchestrator";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

interface SyncRequestBody {
  source?: string;
  includeMitre?: boolean;
  includeCorrelation?: boolean;
}

export async function POST(request: Request) {
  const authResult = await requireThreatIntelContext(request, {
    allowAdminToken: true,
    requireMainOfficer: false,
  });

  if (!authResult.ok) {
    return authResult.response;
  }

  const context = authResult.context;
  if (!context.tokenAuthorized && context.role !== "MAIN_OFFICER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as SyncRequestBody;

    const orchestrator = new ThreatIntelOrchestrator();
    const result = await orchestrator.sync(context.organizationId, {
      source: body.source,
      includeMitre: body.includeMitre,
      includeCorrelation: body.includeCorrelation,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Threat intelligence sync failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
