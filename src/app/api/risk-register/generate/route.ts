import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { enqueue } from "@/lib/queue";

const MAX_BATCH_SIZE = Number(process.env.RISK_GENERATE_BATCH_SIZE ?? 50);

/**
 * Queues risk assessments for vulnerabilities that do not have a completed one.
 *
 * Every assessment is a separate job. This used to run up to ten model calls
 * sequentially inside the request — with a per-call budget of up to 300s, that
 * could not complete.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, {
    allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER"],
  });
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId, userId } = authResult.context;

  try {
    const candidates = await prisma.vulnerability.findMany({
      where: {
        organizationId,
        // Anything without a *completed* assessment. The previous filter
        // excluded any vulnerability with any risk entry at all, so a single
        // FAILED or stranded PROCESSING row made it permanently unassessable.
        riskEntries: { none: { organizationId, status: "ACTIVE" } },
        // Risk is scored for a vulnerability on an asset; skip unlinked ones.
        assets: { some: { asset: { organizationId } } },
      },
      select: {
        id: true,
        assets: {
          where: { asset: { organizationId } },
          take: 1,
          select: { assetId: true },
        },
      },
      take: MAX_BATCH_SIZE,
      orderBy: { updatedAt: "desc" },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ message: "No vulnerabilities need assessment", queued: 0 });
    }

    const jobRunIds: string[] = [];
    for (const vulnerability of candidates) {
      const assetId = vulnerability.assets[0]?.assetId;
      if (!assetId) continue;

      const { jobRunId } = await enqueue(
        "risk.assess",
        { organizationId, vulnerabilityId: vulnerability.id, assetId, userId },
        {
          organizationId,
          entityType: "Vulnerability",
          entityId: vulnerability.id,
          dedupeKey: `risk.assess:${organizationId}:${assetId}:${vulnerability.id}`,
        },
      );
      jobRunIds.push(jobRunId);
    }

    return NextResponse.json(
      {
        message: `Queued ${jobRunIds.length} risk assessment(s).`,
        queued: jobRunIds.length,
        jobRunIds,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Error queueing risk register entries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
