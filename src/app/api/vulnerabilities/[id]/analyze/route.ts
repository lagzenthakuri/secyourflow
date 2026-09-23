import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { enqueue } from "@/lib/queue";

/**
 * Queues an AI risk assessment for one vulnerability.
 *
 * Returns 202 immediately. This used to `await` the whole pipeline inside the
 * request while the AI layer allowed a 300s budget for a self-hosted model, so
 * the client always timed out first and the risk entry was left in PROCESSING
 * with nothing to finish or reap it.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;

        const vulnerability = await prisma.vulnerability.findFirst({
            where: { id, organizationId },
            select: {
                id: true,
                assets: {
                    where: { asset: { organizationId } },
                    take: 1,
                    select: { assetId: true },
                },
            },
        });

        if (!vulnerability) {
            return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
        }

        const assetId = vulnerability.assets[0]?.assetId;
        if (!assetId) {
            return NextResponse.json(
                {
                    error:
                        "No asset is linked to this vulnerability. Risk is assessed for a vulnerability on an asset, so link one first.",
                },
                { status: 400 },
            );
        }

        const { jobRunId, queued } = await enqueue(
            "risk.assess",
            { organizationId, vulnerabilityId: vulnerability.id, assetId, userId },
            {
                organizationId,
                entityType: "Vulnerability",
                entityId: vulnerability.id,
            },
        );

        return NextResponse.json(
            {
                message: queued
                    ? "Risk assessment queued."
                    : "Risk assessment started in-process (no job queue configured).",
                jobRunId,
                queued,
            },
            { status: 202 },
        );
    } catch (error) {
        console.error("Risk analysis enqueue error:", error);
        return NextResponse.json({ error: "Failed to queue analysis" }, { status: 500 });
    }
}
