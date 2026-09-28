import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const createFrameworkSchema = z.object({
    name: z.string().min(2).max(200),
    description: z.string().optional().nullable(),
    version: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const frameworkId = searchParams.get("frameworkId");

    try {
        const where: { id?: string; organizationId: string } = {
            organizationId: authResult.context.organizationId,
        };
        if (frameworkId) where.id = frameworkId;

        const frameworks = await prisma.complianceFramework.findMany({
            where,
            include: {
                controls: true,
                _count: {
                    select: { controls: true },
                },
            },
        });

        const formattedFrameworks = frameworks.map((framework) => {
            const total = framework.controls.length;
            const compliant = framework.controls.filter((control) => control.status === "COMPLIANT").length;
            const nonCompliant = framework.controls.filter((control) => control.status === "NON_COMPLIANT").length;
            const partiallyCompliant = framework.controls.filter(
                (control) => control.status === "PARTIALLY_COMPLIANT",
            ).length;
            const notAssessed = framework.controls.filter((control) => control.status === "NOT_ASSESSED").length;

            const maturitySum = framework.controls.reduce((acc, control) => acc + (control.maturityLevel || 0), 0);
            const avgMaturity = total > 0 ? maturitySum / total : 0;

            const nistCsfBreakdown = {
                GOVERN: framework.controls.filter((control) => control.nistCsfFunction === "GOVERN").length,
                IDENTIFY: framework.controls.filter((control) => control.nistCsfFunction === "IDENTIFY").length,
                PROTECT: framework.controls.filter((control) => control.nistCsfFunction === "PROTECT").length,
                DETECT: framework.controls.filter((control) => control.nistCsfFunction === "DETECT").length,
                RESPOND: framework.controls.filter((control) => control.nistCsfFunction === "RESPOND").length,
                RECOVER: framework.controls.filter((control) => control.nistCsfFunction === "RECOVER").length,
            };

            return {
                frameworkId: framework.id,
                frameworkName: framework.name,
                version: framework.version,
                description: framework.description,
                totalControls: total,
                compliant,
                nonCompliant,
                partiallyCompliant,
                notAssessed,
                compliancePercentage: total > 0 ? (compliant / total) * 100 : 0,
                avgMaturityLevel: avgMaturity,
                nistCsfBreakdown,
                controls: framework.controls,
            };
        });

        const totalFrameworks = formattedFrameworks.length;
        const avgCompliance =
            totalFrameworks > 0
                ? formattedFrameworks.reduce((acc, framework) => acc + framework.compliancePercentage, 0) /
                  totalFrameworks
                : 0;

        return NextResponse.json({
            data: formattedFrameworks,
            summary: {
                totalFrameworks,
                averageCompliance: avgCompliance,
            },
        });
    } catch (error) {
        console.error("Compliance API Error:", error);
        return NextResponse.json({ error: "Failed to fetch framework" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = createFrameworkSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid framework payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const newFramework = await prisma.complianceFramework.create({
            data: {
                ...parsed.data,
                description: parsed.data.description || null,
                version: parsed.data.version || null,
                organizationId: authResult.context.organizationId,
            },
        });

        return NextResponse.json(newFramework, { status: 201 });
    } catch (error) {
        console.error("Create framework error:", error);
        return NextResponse.json({ error: "Failed to create framework" }, { status: 400 });
    }
}
