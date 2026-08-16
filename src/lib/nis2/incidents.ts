import { prisma } from "@/lib/prisma";
import type { Nis2Incident, Nis2IncidentPhase } from "@prisma/client";
import { notifyMainOfficers } from "@/lib/notifications/service";

const HOUR_MS = 60 * 60 * 1000;

/** Art. 23(4)(a): early warning within 24 hours of becoming aware. */
export const EARLY_WARNING_HOURS = 24;
/** Art. 23(4)(b): incident notification within 72 hours of becoming aware. */
export const NOTIFICATION_HOURS = 72;
/** Art. 23(4)(d): final report within one month of the notification. */
export const FINAL_REPORT_DAYS = 30;

/** How long before a deadline the pre-breach alert fires. */
export const PRE_DEADLINE_ALERT_HOURS = 2;

export interface Nis2Deadlines {
    earlyWarningDueAt: Date;
    notificationDueAt: Date;
    finalReportDueAt: Date;
}

/**
 * All three Art. 23 deadlines are anchored on the moment the entity became
 * aware of the incident, which is what `detectedAt` records.
 */
export function computeDeadlines(detectedAt: Date): Nis2Deadlines {
    const finalReportDueAt = new Date(detectedAt.getTime());
    finalReportDueAt.setUTCDate(finalReportDueAt.getUTCDate() + FINAL_REPORT_DAYS);

    return {
        earlyWarningDueAt: new Date(detectedAt.getTime() + EARLY_WARNING_HOURS * HOUR_MS),
        notificationDueAt: new Date(detectedAt.getTime() + NOTIFICATION_HOURS * HOUR_MS),
        finalReportDueAt,
    };
}

export type DeadlineState = "SUBMITTED" | "BREACHED" | "DUE_SOON" | "PENDING";

export interface PhaseStatus {
    phase: Nis2IncidentPhase;
    label: string;
    dueAt: Date;
    submittedAt: Date | null;
    state: DeadlineState;
    /** Milliseconds until the deadline; negative once it has passed. */
    remainingMs: number;
    /** True when the submission landed after the legal deadline. */
    submittedLate: boolean;
}

const PHASE_LABELS: Record<Exclude<Nis2IncidentPhase, "COMPLETE">, string> = {
    EARLY_WARNING: "Early Warning (24h)",
    INCIDENT_NOTIFICATION: "Incident Notification (72h)",
    FINAL_REPORT: "Final Report (1 month)",
};

type DeadlineFields = Pick<
    Nis2Incident,
    | "earlyWarningDueAt"
    | "notificationDueAt"
    | "finalReportDueAt"
    | "earlyWarningSubmittedAt"
    | "notificationSubmittedAt"
    | "finalReportSubmittedAt"
>;

function toPhaseStatus(
    phase: Exclude<Nis2IncidentPhase, "COMPLETE">,
    dueAt: Date,
    submittedAt: Date | null,
    now: Date,
): PhaseStatus {
    const remainingMs = dueAt.getTime() - now.getTime();

    let state: DeadlineState;
    if (submittedAt) {
        state = "SUBMITTED";
    } else if (remainingMs <= 0) {
        state = "BREACHED";
    } else if (remainingMs <= PRE_DEADLINE_ALERT_HOURS * HOUR_MS) {
        state = "DUE_SOON";
    } else {
        state = "PENDING";
    }

    return {
        phase,
        label: PHASE_LABELS[phase],
        dueAt,
        submittedAt,
        state,
        remainingMs,
        submittedLate: submittedAt !== null && submittedAt > dueAt,
    };
}

export function getPhaseStatuses(incident: DeadlineFields, now = new Date()): PhaseStatus[] {
    return [
        toPhaseStatus("EARLY_WARNING", incident.earlyWarningDueAt, incident.earlyWarningSubmittedAt, now),
        toPhaseStatus("INCIDENT_NOTIFICATION", incident.notificationDueAt, incident.notificationSubmittedAt, now),
        toPhaseStatus("FINAL_REPORT", incident.finalReportDueAt, incident.finalReportSubmittedAt, now),
    ];
}

/** The phase the incident should sit in given what has already been submitted. */
export function derivePhase(incident: DeadlineFields): Nis2IncidentPhase {
    if (!incident.earlyWarningSubmittedAt) return "EARLY_WARNING";
    if (!incident.notificationSubmittedAt) return "INCIDENT_NOTIFICATION";
    if (!incident.finalReportSubmittedAt) return "FINAL_REPORT";
    return "COMPLETE";
}

/**
 * Sequential reference per organization and calendar year, e.g. INC-2026-0007.
 * Callers must hold no assumption of gap-free numbering across deletions.
 */
export async function nextIncidentReference(organizationId: string, now = new Date()): Promise<string> {
    const year = now.getUTCFullYear();
    const prefix = `INC-${year}-`;

    const latest = await prisma.nis2Incident.findFirst({
        where: { organizationId, reference: { startsWith: prefix } },
        orderBy: { reference: "desc" },
        select: { reference: true },
    });

    const lastSequence = latest ? Number.parseInt(latest.reference.slice(prefix.length), 10) : 0;
    const next = Number.isFinite(lastSequence) ? lastSequence + 1 : 1;

    return `${prefix}${String(next).padStart(4, "0")}`;
}

/**
 * Builds the CSIRT-ready Early Warning payload. Art. 23(4)(a) requires only an
 * indication of suspected unlawful/malicious cause and cross-border impact —
 * deliberately a thin payload so it can be filed inside 24 hours.
 */
export function buildEarlyWarningPayload(
    incident: Nis2Incident & { affectedAssets?: { asset: { name: string; type: string } }[] },
) {
    return {
        documentType: "NIS2_EARLY_WARNING",
        article: "Art. 23(4)(a)",
        reference: incident.reference,
        detectedAt: incident.detectedAt.toISOString(),
        dueAt: incident.earlyWarningDueAt.toISOString(),
        generatedAt: new Date().toISOString(),
        incident: {
            title: incident.title,
            severity: incident.severity,
            suspectedMalicious: incident.taxonomy !== null,
            taxonomy: incident.taxonomy,
            significantImpact: incident.significantImpact,
            crossBorderImpact: incident.crossBorder,
            affectedUsersEstimate: incident.affectedUsersEstimate,
        },
        affectedAssets:
            incident.affectedAssets?.map((link) => ({ name: link.asset.name, type: link.asset.type })) ?? [],
        submissionNote:
            "Submission to the national CSIRT is a manual step. This document is generated for filing, not transmitted automatically.",
    };
}

/** Art. 23(4)(b): the 72-hour notification, adding assessment and IOCs. */
export function buildNotificationPayload(
    incident: Nis2Incident & {
        affectedAssets?: { asset: { name: string; type: string } }[];
        timeline?: { occurredAt: Date; description: string }[];
    },
) {
    return {
        ...buildEarlyWarningPayload(incident),
        documentType: "NIS2_INCIDENT_NOTIFICATION",
        article: "Art. 23(4)(b)",
        dueAt: incident.notificationDueAt.toISOString(),
        assessment: {
            description: incident.description,
            severityAssessment: incident.severity,
            indicatorsOfCompromise: incident.iocs ?? [],
        },
        timeline:
            incident.timeline?.map((entry) => ({
                occurredAt: entry.occurredAt.toISOString(),
                description: entry.description,
            })) ?? [],
    };
}

/** Art. 23(4)(d): the one-month final report. */
export function buildFinalReportPayload(
    incident: Nis2Incident & {
        affectedAssets?: { asset: { name: string; type: string } }[];
        timeline?: { occurredAt: Date; description: string }[];
    },
) {
    return {
        ...buildNotificationPayload(incident),
        documentType: "NIS2_FINAL_REPORT",
        article: "Art. 23(4)(d)",
        dueAt: incident.finalReportDueAt.toISOString(),
        resolution: {
            status: incident.status,
            crossBorderImpact: incident.crossBorder,
            closedAt: incident.finalReportSubmittedAt?.toISOString() ?? null,
        },
    };
}

export interface DeadlineSweepResult {
    scanned: number;
    dispatched: { reference: string; phase: Nis2IncidentPhase; kind: "PRE_DEADLINE" | "BREACH" }[];
}

/**
 * Dispatches deadline alerts for every incident with an unmet Art. 23
 * obligation. Alerts are recorded in Nis2IncidentAlert under a unique
 * (incident, phase, kind) constraint, so repeated sweeps never re-notify.
 */
export async function sweepDeadlines(organizationId: string, now = new Date()): Promise<DeadlineSweepResult> {
    const incidents = await prisma.nis2Incident.findMany({
        where: { organizationId, phase: { not: "COMPLETE" }, status: { not: "CLOSED" } },
        include: { alerts: true },
    });

    const dispatched: DeadlineSweepResult["dispatched"] = [];

    for (const incident of incidents) {
        for (const phase of getPhaseStatuses(incident, now)) {
            if (phase.state !== "BREACHED" && phase.state !== "DUE_SOON") continue;

            const kind = phase.state === "BREACHED" ? "BREACH" : "PRE_DEADLINE";
            const alreadySent = incident.alerts.some(
                (alert) => alert.phase === phase.phase && alert.kind === kind,
            );
            if (alreadySent) continue;

            try {
                await prisma.nis2IncidentAlert.create({
                    data: { incidentId: incident.id, phase: phase.phase, kind },
                });
            } catch {
                // Unique constraint hit by a concurrent sweep — the alert is
                // already accounted for, so skip the notification.
                continue;
            }

            const message =
                kind === "BREACH"
                    ? `${phase.label} deadline for ${incident.reference} has passed without submission.`
                    : `${phase.label} deadline for ${incident.reference} is less than ${PRE_DEADLINE_ALERT_HOURS} hours away.`;

            await notifyMainOfficers(
                organizationId,
                `NIS2 Art. 23 deadline: ${incident.reference}`,
                message,
                `/nis2/incidents/${incident.id}`,
            );

            dispatched.push({ reference: incident.reference, phase: phase.phase, kind });
        }
    }

    return { scanned: incidents.length, dispatched };
}
