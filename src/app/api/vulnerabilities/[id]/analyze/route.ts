import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;

        // Find vulnerability and its first associated asset
        const vulnerability = await prisma.vulnerability.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            include: {
                assets: {
                    where: {
                        asset: {
                            organizationId: authResult.context.organizationId,
                        },
                    },
                    take: 1
                }
            }
        });

        if (!vulnerability) {
            return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
        }

        const assetId = vulnerability.assets[0]?.assetId;

        if (!assetId) {
            return NextResponse.json({
                error: "No asset associated with this vulnerability. Please associate an asset before analyzing risk."
            }, { status: 400 });
        }

        // Trigger analysis
        // Note: In a real app we might want to wait or return a pending state
        await processRiskAssessment(
            vulnerability.id,
            assetId,
            authResult.context.organizationId,
            authResult.context.userId,
        );

        return NextResponse.json({ message: "Analysis triggered and completed" });

    } catch (error) {
        console.error("Risk Analysis Trigger Error:", error);
        return NextResponse.json({ error: "Failed to trigger analysis" }, { status: 500 });
    }
}
