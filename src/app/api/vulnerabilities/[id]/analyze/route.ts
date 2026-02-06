import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { processRiskAssessment } from "@/lib/risk-engine";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Find vulnerability and its first associated asset
        const vulnerability = await prisma.vulnerability.findUnique({
            where: { id },
            include: {
                assets: {
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
        await processRiskAssessment(vulnerability.id, assetId, vulnerability.organizationId);

        return NextResponse.json({ message: "Analysis triggered and completed" });

    } catch (error) {
        console.error("Risk Analysis Trigger Error:", error);
        return NextResponse.json({ error: "Failed to trigger analysis" }, { status: 500 });
    }
}
