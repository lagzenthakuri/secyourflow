import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireSessionWithOrg } from "@/lib/api-auth";

const MAX_BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, {
    allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER"],
  });
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const vulnerabilities = await prisma.vulnerability.findMany({
      where: {
        organizationId: authResult.context.organizationId,
        riskEntries: {
          none: {
            organizationId: authResult.context.organizationId,
          },
        },
      },
      include: {
        assets: {
          where: {
            asset: {
              organizationId: authResult.context.organizationId,
            },
          },
          take: 1,
          select: {
            assetId: true,
          },
        },
      },
      take: MAX_BATCH_SIZE,
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (vulnerabilities.length === 0) {
      return NextResponse.json({ message: "No new vulnerabilities to assess", count: 0 });
    }

    let processedCount = 0;
    const failures: Array<{ vulnerabilityId: string; reason: string }> = [];

    for (const vulnerability of vulnerabilities) {
      const assetId = vulnerability.assets[0]?.assetId;
      if (!assetId) {
        continue;
      }

      try {
        await processRiskAssessment(vulnerability.id, assetId, authResult.context.organizationId);
        processedCount += 1;
      } catch (error) {
        failures.push({
          vulnerabilityId: vulnerability.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${processedCount} vulnerabilities`,
      count: processedCount,
      failed: failures,
    });
  } catch (error) {
    console.error("Error generating risk register entries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
