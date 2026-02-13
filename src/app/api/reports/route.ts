import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAIReportSummary } from "@/lib/report-engine";
import { buildComplianceFrameworkReport } from "@/lib/compliance-reporting";
import { requireApiAuth } from "@/lib/security/api-auth";

const createReportSchema = z.object({
    name: z.string().trim().min(1).max(160).optional(),
    type: z.string().trim().min(1),
    description: z.string().trim().max(4000).optional(),
    format: z.string().trim().max(24).optional(),
    frameworkId: z.string().trim().optional(),
});

export async function GET() {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const reports = await prisma.report.findMany({
            where: { organizationId: authResult.context.organizationId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(reports);
    } catch {
        console.error("Reports GET Error");
        return NextResponse.json(
            { error: "Failed to fetch reports" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({ request });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = await request.json();
        const parsed = createReportSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid report payload" }, { status: 400 });
        }

        const orgId = authResult.context.organizationId;
        const userId = authResult.context.userId;
        const reportType = parsed.data.type;

        if (reportType === "compliance") {
            const framework = parsed.data.frameworkId
                ? await prisma.complianceFramework.findFirst({
                    where: {
                        id: parsed.data.frameworkId,
                        organizationId: orgId,
                    },
                })
                : await prisma.complianceFramework.findFirst({
                    where: { organizationId: orgId },
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
                    type: reportType,
                    description: frameworkReport.executiveSummary.substring(0, 1000),
                    format: parsed.data.format || "PDF",
                    status: "COMPLETED",
                    size: `${frameworkReport.summary.totalControls} controls`,
                    url: `/api/compliance/reports/${framework.id}/pdf`,
                    organizationId: orgId,
                    userId,
                }
            });

            return NextResponse.json(completedReport, { status: 201 });
        }

        const defaultName = parsed.data.name ?? `${reportType.toUpperCase()} Report ${new Date().toISOString().slice(0, 10)}`;
        const newReport = await prisma.report.create({
            data: {
                name: defaultName,
                type: reportType,
                description: parsed.data.description || "Generating AI summary...",
                format: parsed.data.format || "PDF",
                status: "PENDING",
                size: "Pending",
                url: "#",
                organizationId: orgId,
                userId,
            },
        });

        // Trigger AI summary generation in background
        generateAIReportSummary(newReport.id).then(() => {
            prisma.report.update({
                where: { id: newReport.id },
                data: {
                    status: "COMPLETED",
                    size: "Generated"
                }
            }).catch(console.error);
        });

        return NextResponse.json(newReport, { status: 201 });
    } catch {
        console.error("Reports POST Error");
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 400 }
        );
    }
}
