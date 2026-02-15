import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Get user's organization to ensure data isolation
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { organizationId: true },
        });

        if (!user?.organizationId) {
            return NextResponse.json({ error: "Organization context required" }, { status: 403 });
        }

        const organizationId = user.organizationId;

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

        // If no real data, fallback to some smart defaults so the UI isn't empty for new users
        if (activeChecks.length === 0) {
            // We can leave it empty or provide "System Checks"
            // Let's leave it empty to be honest, or maybe the UI handles empty state?
            // The original mock had data. Let's return the mock data structure if DB is empty to "show off" features
            // But for "functionable", we should prefer real data.
            // However, if the user just created an account, they won't have data.
            // Let's stick to real data, but if < 3, maybe pad with "System Health" checks?
            // No, let's just return what we have.
        }

        // 2. Pending Evidence Tasks
        // Controls that are NOT COMPLIANT and missing evidence
        const pendingControls = await prisma.complianceControl.findMany({
            where: {
                framework: { organizationId },
                status: { in: ["NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_ASSESSED"] },
                evidence: null, // Simple check for now
                // In a real app, we might check for evidenceFiles relation count = 0
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

        // 3. AI Insights
        // This would typically involve an LLM call. 
        // For now, we will construct insights based on the actual status and notes.
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

        // If no notes-based insights, generate some "General" insights based on overall posture
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
