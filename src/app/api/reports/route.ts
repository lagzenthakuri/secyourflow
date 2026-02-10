import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReportSummary } from "@/lib/report-engine";
import { buildComplianceFrameworkReport } from "@/lib/compliance-reporting";

export async function GET() {
    try {
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const reports = await prisma.report.findMany({
            where: { organizationId: org.id },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error("Reports GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch reports" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        // Use first user as reporter for now (in real app, use auth session)
        const user = await prisma.user.findFirst({
            where: { organizationId: org.id }
        });
        if (!user) throw new Error("No user found");

        if (body.type === "compliance") {
            const framework = body.frameworkId
                ? await prisma.complianceFramework.findFirst({
                    where: {
                        id: body.frameworkId,
                        organizationId: org.id,
                    },
                })
                : await prisma.complianceFramework.findFirst({
                    where: { organizationId: org.id },
                    orderBy: { updatedAt: "desc" }
                });

            if (!framework) {
                return NextResponse.json(
                    { error: "No compliance framework available for report generation" },
                    { status: 400 }
                );
            }

            const frameworkReport = await buildComplianceFrameworkReport(framework.id);
            const completedReport = await prisma.report.create({
                data: {
                    name: `${framework.name} Compliance Audit Report`,
                    type: body.type,
                    description: frameworkReport.executiveSummary.substring(0, 1000),
                    format: body.format || "PDF",
                    status: "COMPLETED",
                    size: `${frameworkReport.summary.totalControls} controls`,
                    url: `/api/compliance/reports/${framework.id}/pdf`,
                    organizationId: org.id,
                    userId: user.id,
                }
            });

            return NextResponse.json(completedReport, { status: 201 });
        }

        const newReport = await prisma.report.create({
            data: {
                name: body.name,
                type: body.type,
                description: body.description || "Generating AI Summary...",
                format: body.format || "PDF",
                status: "PENDING",
                size: "Calculating...",
                url: "#",
                organizationId: org.id,
                userId: user.id,
            },
        });

        // Trigger AI summary generation in background
        generateAIReportSummary(newReport.id).then(() => {
            prisma.report.update({
                where: { id: newReport.id },
                data: {
                    status: "COMPLETED",
                    size: (Math.random() * 5 + 1).toFixed(1) + " MB"
                }
            }).catch(console.error);
        });

        return NextResponse.json(newReport, { status: 201 });
    } catch (error) {
        console.error("Reports POST Error:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 400 }
        );
    }
}
