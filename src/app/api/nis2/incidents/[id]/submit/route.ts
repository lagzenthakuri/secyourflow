import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    buildEarlyWarningPayload,
    buildFinalReportPayload,
    buildNotificationPayload,
    derivePhase,
    getPhaseStatuses,
} from "@/lib/nis2/incidents";

const submitSchema = z.object({
    phase: z.enum(["EARLY_WARNING", "INCIDENT_NOTIFICATION", "FINAL_REPORT"]),
    /** Set false to regenerate the artefact without recording a submission. */
    markSubmitted: z.boolean().default(true),
});

/**
 * Generates the CSIRT-ready artefact for an Art. 23 phase and records the
 * submission timestamp. Filing with the national CSIRT remains a manual step —
 * nothing is transmitted from here.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = submitSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid submission payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { phase, markSubmitted } = parsed.data;

        const incident = await prisma.nis2Incident.findFirst({
            where: { id, organizationId },
            include: {
                affectedAssets: { include: { asset: { select: { name: true, type: true } } } },
                timeline: { orderBy: { occurredAt: "asc" } },
            },
        });

        if (!incident) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 });
        }

        // Art. 23 phases are sequential — each builds on the previous filing.
        if (phase === "INCIDENT_NOTIFICATION" && !incident.earlyWarningSubmittedAt) {
            return NextResponse.json(
                { error: "Early Warning must be submitted before the Incident Notification" },
                { status: 409 },
            );
        }
        if (phase === "FINAL_REPORT" && !incident.notificationSubmittedAt) {
            return NextResponse.json(
                { error: "Incident Notification must be submitted before the Final Report" },
                { status: 409 },
            );
        }

        const now = new Date();
        const payload =
            phase === "EARLY_WARNING"
                ? buildEarlyWarningPayload(incident)
                : phase === "INCIDENT_NOTIFICATION"
                  ? buildNotificationPayload(incident)
                  : buildFinalReportPayload(incident);

        if (!markSubmitted) {
            return NextResponse.json({ data: { payload, recorded: false } });
        }

        const submissionField = {
            EARLY_WARNING: { earlyWarningSubmittedAt: now, earlyWarningPayload: payload },
            INCIDENT_NOTIFICATION: { notificationSubmittedAt: now, notificationPayload: payload },
            FINAL_REPORT: { finalReportSubmittedAt: now, finalReportPayload: payload },
        }[phase];

        const withSubmission = { ...incident, ...submissionField };

        const updated = await prisma.nis2Incident.update({
            where: { id: incident.id },
            data: {
                ...submissionField,
                phase: derivePhase(withSubmission),
                timeline: {
                    create: {
                        occurredAt: now,
                        description: `${phase.replace(/_/g, " ").toLowerCase()} artefact generated and marked as submitted to the CSIRT.`,
                        authorId: userId,
                    },
                },
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_INCIDENT_PHASE_SUBMITTED",
                entityType: "Nis2Incident",
                entityId: updated.id,
                newValue: { reference: updated.reference, phase, submittedAt: now.toISOString() },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({
            data: { payload, recorded: true, incident: { ...updated, phases: getPhaseStatuses(updated, now) } },
        });
    } catch (error) {
        console.error("Error submitting NIS2 incident phase:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
