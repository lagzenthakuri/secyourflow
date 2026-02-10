
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { processRiskAssessment } from "@/lib/risk-engine";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export async function POST() {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        let user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, organizationId: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.organizationId) {
            const firstOrg = await prisma.organization.findFirst();
            if (firstOrg) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: firstOrg.id },
                    select: { id: true, organizationId: true }
                });
            } else {
                const newOrg = await prisma.organization.create({
                    data: { name: "My Organization" }
                });
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: newOrg.id },
                    select: { id: true, organizationId: true }
                });
            }
        }

        if (!user || !user.organizationId) {
            return NextResponse.json({ error: "Organization not found" }, { status: 403 });
        }

        // 1. Find all vulnerabilities that have linked assets but NO risk entry
        // We look for vulnerabilities where none of their riskEntries match the current org
        const vulnerabilities = await prisma.vulnerability.findMany({
            where: {
                organizationId: user.organizationId,
                riskEntries: {
                    none: {}
                }
            },
            include: {
                assets: {
                    take: 1 // Just take the first asset for the risk assessment context
                }
            },
            take: 5 // Limit to 5 at a time to avoid timeout/rate limits during demo
        });

        if (vulnerabilities.length === 0) {
            return NextResponse.json({ message: "No new vulnerabilities to assess", count: 0 });
        }

        // 2. Trigger Assessment for each
        let processedCount = 0;
        for (const vuln of vulnerabilities) {
            if (vuln.assets.length > 0) {
                // We need the assetId. Connection is via AssetVulnerability (assets field)
                const assetVulnerability = vuln.assets[0];
                await processRiskAssessment(vuln.id, assetVulnerability.assetId, user.organizationId);
                processedCount++;
            }
        }

        return NextResponse.json({
            message: `Started assessment for ${processedCount} vulnerabilities`,
            count: processedCount
        });

    } catch (error) {
        console.error("Error generating risks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
