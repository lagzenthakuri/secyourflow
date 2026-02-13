import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

const createFrameworkSchema = z.object({
    name: z.string().trim().min(1).max(160),
    version: z.string().trim().max(80).optional(),
    description: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const frameworkId = searchParams.get("frameworkId");

    try {
        const where: Record<string, string> = { organizationId: authResult.context.organizationId };
        if (frameworkId) where.id = frameworkId;

        const frameworks = await prisma.complianceFramework.findMany({
            where,
            include: {
                controls: true,
                _count: {
                    select: { controls: true }
                }
            }
        });

        const formattedFrameworks = frameworks.map(f => {
            const total = f.controls.length;
            const compliant = f.controls.filter(c => c.status === 'COMPLIANT').length;
            const nonCompliant = f.controls.filter(c => c.status === 'NON_COMPLIANT').length;
            const partiallyCompliant = f.controls.filter(c => c.status === 'PARTIALLY_COMPLIANT').length;
            const notAssessed = f.controls.filter(c => c.status === 'NOT_ASSESSED').length;

            // Calculate average maturity level
            const maturitySum = f.controls.reduce((acc, c) => acc + (c.maturityLevel || 0), 0);
            const avgMaturity = total > 0 ? maturitySum / total : 0;

            // NIST CSF Function breakdown
            const nistCsfBreakdown = {
                GOVERN: f.controls.filter(c => c.nistCsfFunction === 'GOVERN').length,
                IDENTIFY: f.controls.filter(c => c.nistCsfFunction === 'IDENTIFY').length,
                PROTECT: f.controls.filter(c => c.nistCsfFunction === 'PROTECT').length,
                DETECT: f.controls.filter(c => c.nistCsfFunction === 'DETECT').length,
                RESPOND: f.controls.filter(c => c.nistCsfFunction === 'RESPOND').length,
                RECOVER: f.controls.filter(c => c.nistCsfFunction === 'RECOVER').length,
            };

            return {
                frameworkId: f.id,
                frameworkName: f.name,
                version: f.version,
                description: f.description,
                totalControls: total,
                compliant,
                nonCompliant,
                partiallyCompliant,
                notAssessed,
                compliancePercentage: total > 0 ? (compliant / total) * 100 : 0,
                avgMaturityLevel: avgMaturity,
                nistCsfBreakdown,
                controls: f.controls,
            };
        });

        const totalFrameworks = formattedFrameworks.length;
        const avgCompliance = totalFrameworks > 0
            ? formattedFrameworks.reduce((acc, f) => acc + f.compliancePercentage, 0) / totalFrameworks
            : 0;

        return NextResponse.json({
            data: formattedFrameworks,
            summary: {
                totalFrameworks,
                averageCompliance: avgCompliance,
            },
        });
    } catch {
        console.error("Compliance API Error");
        return NextResponse.json(
            { error: "Failed to fetch framework" },
            { status: 500 }
        );
    }
}


export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = await request.json();
        const parsed = createFrameworkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid framework payload" }, { status: 400 });
        }

        const newFramework = await prisma.complianceFramework.create({
            data: {
                ...parsed.data,
                organizationId: authResult.context.organizationId,
            },
        });

        return NextResponse.json(newFramework, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create framework" },
            { status: 400 }
        );
    }
}
