import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId } = authResult.context;

    try {
        // 1. Active Monitoring
        // Fetch controls that are recently assessed or are of type DETECTIVE
        // We'll treat these as "Continuous Monitoring Checks"
        const monitoredControls = await prisma.complianceControl.findMany({
            where: {
                framework: {
                    organizationId,
                },
                OR: [
                    { controlType: "DETECTIVE" },
                    { lastAssessed: { not: null } }
                ]
            },
            take: 5,
            orderBy: {
                lastAssessed: "desc",
            },
            include: {
                framework: {
                    select: { name: true }
                }
            }
        });

        const activeChecks = monitoredControls.map(control => ({
            id: control.id,
            name: control.title,
            frameworks: [control.framework.name],
            status: control.status === "COMPLIANT" ? "PASS" :
                control.status === "NON_COMPLIANT" ? "FAIL" : "WARNING",
            lastChecked: control.lastAssessed
                ? getRelativeTime(control.lastAssessed)
                : "Never",
            controlId: control.controlId
        }));

        // 2. Pending Evidence Tasks
        // Controls that are NOT COMPLIANT and missing evidence
        const pendingControls = await prisma.complianceControl.findMany({
            where: {
                framework: { organizationId },
                status: { in: ["NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_ASSESSED"] },
                evidence: null,
            },
            take: 5,
            orderBy: {
                updatedAt: "desc"
            },
            include: {
                framework: { select: { name: true } }
            }
        });

        const evidenceTasks = pendingControls.map(control => ({
            id: `TSK-${control.id.substring(0, 4)}`,
            description: `Upload evidence for ${control.title}`,
            controlId: control.controlId,
            priority: control.status === "NON_COMPLIANT" ? "HIGH" : "MEDIUM",
            dueDate: control.nextAssessment
                ? new Date(control.nextAssessment).toLocaleDateString()
                : "Review Required"
        }));

        // 3. Insights derived from stored assessment notes and control status.
        // Deliberately not an LLM call: this endpoint is polled every 30s by the
        // dashboard widget.
        const insightControls = await prisma.complianceControl.findMany({
            where: {
                framework: { organizationId },
                notes: { not: null }
            },
            take: 3,
            orderBy: { updatedAt: "desc" }
        });

        const aiInsights = insightControls.map(control => ({
            controlId: control.controlId,
            explanation: control.notes || `Analysis of ${control.controlId} indicates ${control.status.toLowerCase().replace('_', ' ')} status.`,
            sentiment: control.status === "COMPLIANT" ? "positive" :
                control.status === "NON_COMPLIANT" ? "negative" : "neutral"
        }));

        // With no per-control notes, fall back to a summary of overall posture.
        if (aiInsights.length === 0 && monitoredControls.length > 0) {
            const failingCount = monitoredControls.filter(c => c.status === "NON_COMPLIANT").length;
            aiInsights.push({
                controlId: "Summary",
                explanation: failingCount > 0
                    ? `${failingCount} controls are currently failing compliance checks. Focus on ${monitoredControls.find(c => c.status === "NON_COMPLIANT")?.title || "high priority items"}.`
                    : "All monitored controls are currently passing. System posture is healthy.",
                sentiment: failingCount > 0 ? "negative" : "positive"
            });
        }

        return NextResponse.json({
            checks: activeChecks,
            evidenceTasks: evidenceTasks,
            aiInsights: aiInsights
        });

    } catch (error) {
        console.error("Compliance Engine API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function getRelativeTime(date: Date) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const now = new Date();
    const diffInSeconds = (date.getTime() - now.getTime()) / 1000;

    if (Math.abs(diffInSeconds) < 60) return "just now";
    if (Math.abs(diffInSeconds) < 3600) return rtf.format(Math.ceil(diffInSeconds / 60), 'minute');
    if (Math.abs(diffInSeconds) < 86400) return rtf.format(Math.ceil(diffInSeconds / 3600), 'hour');
    return rtf.format(Math.ceil(diffInSeconds / 86400), 'day');
}
