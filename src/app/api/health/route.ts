import { NextResponse } from "next/server";
import { IngestionOrchestrator } from "@/modules/cve-ingestion/orchestrator";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const orchestrator = new IngestionOrchestrator();
    const health = await orchestrator.getHealth();

    // CVE/KEV/EPSS ingestion is optional background data. Reaching this point
    // proves that the core database is available, so a feed outage must not
    // mark the whole application unready and take authentication offline.
    const serviceStatus = health.overallStatus === "healthy" ? "healthy" : "degraded";

    return NextResponse.json(
      {
        status: serviceStatus,
        attribution: "This product uses the NVD API but is not endorsed or certified by the NVD.",
        sources: health.sources.map((source) => ({
          name: source.name,
          status: source.status,
          lastSuccessAt: source.lastSuccessAt,
          lastAttemptAt: source.lastAttemptAt,
          recordsProcessed: source.recordsProcessed,
        })),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorType = error instanceof Error ? error.name : typeof error;
    const errorCode =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : null;

    // The endpoint is public. Keep database hosts, driver messages, and other
    // deployment details in server logs instead of returning them to clients.
    console.error("[health] Readiness check failed.", { errorType, errorCode });

    return NextResponse.json(
      {
        status: "down",
        error: "A required service dependency is unavailable.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
