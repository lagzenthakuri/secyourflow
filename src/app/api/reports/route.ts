import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReportSummary } from "@/lib/report-engine";

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
        generateAIReportSummary(newReport.id).then(summary => {
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
