import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelQueryService } from "@/modules/threat-intel/query-service";

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const service = new ThreatIntelQueryService();
    const campaigns = await service.getCampaigns();
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch campaigns",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
