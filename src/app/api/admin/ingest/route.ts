import { NextResponse } from "next/server";
import { IngestionOrchestrator } from "@/modules/cve-ingestion/orchestrator";
import { logger } from "@/modules/cve-ingestion/utils/logger";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes

function isAuthorizedByAdminToken(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;

  if (!adminToken) {
    logger.warn("ADMIN_API_TOKEN not set - falling back to session-based authorization");
    return false;
  }

  return authHeader === `Bearer ${adminToken}`;
}

export async function POST(request: Request) {
  const tokenAuthorized = isAuthorizedByAdminToken(request);
  if (!tokenAuthorized) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const hasSessionCookie =
      /(__Secure-)?(next-auth|authjs)\.session-token=/.test(cookieHeader);

    if (!hasSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await auth();
    const sessionAuthorized =
      session?.user?.role === "MAIN_OFFICER" && isTwoFactorSatisfied(session);

    if (!sessionAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!tokenAuthorized && process.env.ADMIN_API_TOKEN) {
    logger.info("Admin ingest authorized via NextAuth session (MAIN_OFFICER + 2FA).");
  }

  try {
    const body = await request.json().catch(() => ({}));
    const source = body.source as string | undefined;

    const orchestrator = new IngestionOrchestrator();

    if (source === "nvd") {
      const result = await orchestrator.ingestNvd();
      return NextResponse.json(result);
    } else if (source === "kev") {
      const result = await orchestrator.enrichWithKev();
      return NextResponse.json(result);
    } else if (source === "epss") {
      const result = await orchestrator.enrichWithEpss();
      return NextResponse.json(result);
    } else {
      // Run full pipeline
      const results = await orchestrator.runFullIngestion();
      return NextResponse.json({ results });
    }
  } catch (error) {
    logger.error("Ingestion API error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: "Ingestion failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
