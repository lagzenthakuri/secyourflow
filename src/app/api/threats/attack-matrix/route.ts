import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelQueryService } from "@/modules/threat-intel/query-service";
import { getThreatIntelConfig } from "@/modules/threat-intel/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const config = getThreatIntelConfig();
  if (!config.features.attackMatrixEnabled) {
    return NextResponse.json({ error: "ATT&CK matrix is disabled" }, { status: 403 });
  }

  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const service = new ThreatIntelQueryService();
    const matrix = await service.getAttackMatrix(authResult.context.organizationId);
    return NextResponse.json(matrix);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch ATT&CK matrix",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
