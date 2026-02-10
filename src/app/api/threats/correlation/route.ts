import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelRepository } from "@/modules/threat-intel/persistence/repository";
import { getThreatIntelConfig } from "@/modules/threat-intel/config";
import { IocCorrelationEngine } from "@/modules/threat-intel/correlation/engine";

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const repository = new ThreatIntelRepository();
    const matches = await repository.listIndicatorMatches(authResult.context.organizationId);
    return NextResponse.json({ data: matches });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch correlation results",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireThreatIntelContext(request, { requireMainOfficer: true });
  if (!authResult.ok) {
    return authResult.response;
  }

  const config = getThreatIntelConfig();
  if (!config.features.iocCorrelationEnabled) {
    return NextResponse.json({ error: "IOC correlation is disabled" }, { status: 403 });
  }

  try {
    const repository = new ThreatIntelRepository();
    const engine = new IocCorrelationEngine(repository, config);
    const summary = await engine.run(authResult.context.organizationId);

    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to run IOC correlation",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
