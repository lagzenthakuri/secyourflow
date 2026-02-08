import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const frameworkId = searchParams.get("frameworkId");

    try {
        const where: any = {};
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
    } catch (error) {
        console.error("Compliance API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch framework" },
            { status: 500 }
        );
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const newFramework = await prisma.complianceFramework.create({
            data: {
                ...body,
                organizationId: org.id,
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
