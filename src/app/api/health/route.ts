import { NextResponse } from "next/server";
import { IngestionOrchestrator } from "@/modules/cve-ingestion/orchestrator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const orchestrator = new IngestionOrchestrator();
    const health = await orchestrator.getHealth();

    const statusCode = health.overallStatus === "healthy" ? 200 : health.overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(
      {
        status: health.overallStatus,
        attribution: "This product uses the NVD API but is not endorsed or certified by the NVD.",
        sources: health.sources,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error("Health endpoint error", error);
    return NextResponse.json(
      {
        status: "down",
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
