import { NextResponse } from "next/server";
import { IngestionOrchestrator } from "@/modules/cve-ingestion/orchestrator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * The ingestion health check intentionally treats external feeds as optional,
 * but the application schema is not optional. Check the tables and columns
 * used by authentication and the core GRC pages before reporting a deployment
 * as ready; otherwise a partial migration can leave the health endpoint green
 * while the dashboard fails one request at a time.
 */
async function assertApplicationSchema(): Promise<void> {
  await prisma.user.findFirst({
    select: { id: true },
    take: 1,
  });
  await prisma.account.findFirst({
    select: { id: true },
    take: 1,
  });
  await prisma.nis2Vendor.findFirst({
    select: { id: true },
    take: 1,
  });
  await prisma.riskAppetite.findFirst({
    select: { id: true },
    take: 1,
  });
  await prisma.riskRegister.findFirst({
    select: {
      id: true,
      vendorId: true,
      analysisSource: true,
      failureReason: true,
    },
    take: 1,
  });
  await prisma.setting.findFirst({
    select: {
      id: true,
      aiProvider: true,
      aiModel: true,
      aiEndpoint: true,
    },
    take: 1,
  });
}

export async function GET() {
  try {
    await assertApplicationSchema();

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
