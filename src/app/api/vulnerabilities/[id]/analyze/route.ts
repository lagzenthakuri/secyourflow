import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireApiAuth({ request });
        if ("response" in authResult) {
            return authResult.response;
        }

        const { id } = await params;
        const orgId = authResult.context.organizationId;

        const vulnerability = await prisma.vulnerability.findFirst({
            where: {
                id,
                organizationId: orgId,
            },
            include: {
                assets: {
                    take: 1,
                    include: {
                        asset: {
                            select: {
                                id: true,
                                organizationId: true,
                            },
                        },
                    },
                }
            }
        });

        if (!vulnerability) {
            return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
        }

        const linkedAsset = vulnerability.assets[0]?.asset;
        const assetId = linkedAsset?.id;

        if (!assetId || linkedAsset.organizationId !== orgId) {
            return NextResponse.json({
                error: "No valid asset associated with this vulnerability. Please associate an in-organization asset before analyzing risk."
            }, { status: 400 });
        }

        await processRiskAssessment(vulnerability.id, assetId, orgId, authResult.context.userId);

        return NextResponse.json({ message: "Analysis triggered and completed" });

    } catch (error) {
        console.error("Risk Analysis Trigger Error:", error);
        return NextResponse.json({ error: "Failed to trigger analysis" }, { status: 500 });
    }
}
