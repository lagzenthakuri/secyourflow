import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { processRiskAssessment } from "@/lib/risk-engine";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(request: Request) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const organizationId = authResult.context.organizationId;

        const vulnerabilities = await prisma.vulnerability.findMany({
            where: {
                organizationId,
                riskEntries: {
                    none: {
                        organizationId,
                    },
                },
            },
            include: {
                assets: {
                    take: 1,
                },
            },
            take: 5,
        });

        if (vulnerabilities.length === 0) {
            return NextResponse.json({ message: "No new vulnerabilities to assess", count: 0 });
        }

        let processedCount = 0;
        for (const vuln of vulnerabilities) {
            if (vuln.assets.length === 0) {
                continue;
            }

            const assetVulnerability = vuln.assets[0];
            await processRiskAssessment(vuln.id, assetVulnerability.assetId, organizationId, authResult.context.userId);
            processedCount += 1;
        }

        return NextResponse.json({
            message: `Started assessment for ${processedCount} vulnerabilities`,
            count: processedCount,
        });
    } catch {
        console.error("Error generating risks");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
