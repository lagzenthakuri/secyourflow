import { prisma } from "@/lib/prisma";
import type { Nis2Article21Measure, Nis2ChecklistItem, Nis2ChecklistStatus } from "@prisma/client";
import {
    NIS2_ARTICLE_21_MEASURES,
    NIS2_CHECKLIST_TEMPLATE,
    getMeasureDefinition,
} from "@/lib/nis2/article21-catalog";

/**
 * Creates any checklist items the organization is missing. Existing items are
 * left untouched apart from the immutable template text (title, description,
 * verification mode), so re-seeding after a catalog update is safe.
 */
export async function seedChecklist(organizationId: string): Promise<{ created: number; refreshed: number }> {
    const existing = await prisma.nis2ChecklistItem.findMany({
        where: { organizationId },
        select: { code: true },
    });
    const existingCodes = new Set(existing.map((item) => item.code));

    const missing = NIS2_CHECKLIST_TEMPLATE.filter((item) => !existingCodes.has(item.code));

    if (missing.length > 0) {
        await prisma.nis2ChecklistItem.createMany({
            data: missing.map((item) => ({
                organizationId,
                code: item.code,
                measure: item.measure,
                title: item.title,
                description: item.description,
                verificationMode: item.verificationMode,
            })),
            skipDuplicates: true,
        });
    }

    const stale = NIS2_CHECKLIST_TEMPLATE.filter((item) => existingCodes.has(item.code));
    if (stale.length > 0) {
        await prisma.$transaction(
            stale.map((item) =>
                prisma.nis2ChecklistItem.update({
                    where: { organizationId_code: { organizationId, code: item.code } },
                    data: {
                        measure: item.measure,
                        title: item.title,
                        description: item.description,
                        verificationMode: item.verificationMode,
                    },
                }),
            ),
        );
    }

    return { created: missing.length, refreshed: stale.length };
}

export interface MeasureCoverage {
    measure: Nis2Article21Measure;
    letter: string;
    label: string;
    total: number;
    implemented: number;
    inProgress: number;
    notStarted: number;
    notApplicable: number;
    escalated: number;
    /** Percentage of in-scope (non-N/A) items that are implemented. */
    coverage: number;
}

export interface GovernanceSummary {
    totalItems: number;
    implemented: number;
    inProgress: number;
    notStarted: number;
    notApplicable: number;
    escalated: number;
    overdue: number;
    unassigned: number;
    /** Overall percentage of in-scope items implemented. */
    coverage: number;
    byMeasure: MeasureCoverage[];
}

function coveragePercent(implemented: number, inScope: number): number {
    if (inScope <= 0) return 100;
    return Math.round((implemented / inScope) * 1000) / 10;
}

export function summarizeChecklist(items: Nis2ChecklistItem[], now = new Date()): GovernanceSummary {
    const countBy = (subset: Nis2ChecklistItem[], status: Nis2ChecklistStatus) =>
        subset.filter((item) => item.status === status).length;

    const byMeasure = NIS2_ARTICLE_21_MEASURES.map<MeasureCoverage>((definition) => {
        const subset = items.filter((item) => item.measure === definition.measure);
        const implemented = countBy(subset, "IMPLEMENTED");
        const notApplicable = countBy(subset, "NOT_APPLICABLE");

        return {
            measure: definition.measure,
            letter: definition.letter,
            label: definition.label,
            total: subset.length,
            implemented,
            inProgress: countBy(subset, "IN_PROGRESS"),
            notStarted: countBy(subset, "NOT_STARTED"),
            notApplicable,
            escalated: subset.filter((item) => item.escalated).length,
            coverage: coveragePercent(implemented, subset.length - notApplicable),
        };
    });

    const implemented = countBy(items, "IMPLEMENTED");
    const notApplicable = countBy(items, "NOT_APPLICABLE");

    return {
        totalItems: items.length,
        implemented,
        inProgress: countBy(items, "IN_PROGRESS"),
        notStarted: countBy(items, "NOT_STARTED"),
        notApplicable,
        escalated: items.filter((item) => item.escalated).length,
        overdue: items.filter(
            (item) =>
                item.dueDate !== null &&
                item.dueDate < now &&
                item.status !== "IMPLEMENTED" &&
                item.status !== "NOT_APPLICABLE",
        ).length,
        unassigned: items.filter((item) => item.ownerId === null && item.status !== "NOT_APPLICABLE").length,
        coverage: coveragePercent(implemented, items.length - notApplicable),
        byMeasure,
    };
}

export async function getGovernanceSummary(organizationId: string): Promise<GovernanceSummary> {
    const items = await prisma.nis2ChecklistItem.findMany({ where: { organizationId } });
    return summarizeChecklist(items);
}

/**
 * Checklist codes that open HIGH/CRITICAL technical findings call into
 * question. Art. 21(2)(a) requires the risk analysis to actually reflect the
 * state of the estate, so unresolved severe findings escalate the items whose
 * control they contradict.
 */
const RISK_BRIDGE_CODES = ["A.4", "E.2", "G.3"] as const;

export interface RiskSyncResult {
    openHighCritical: number;
    escalated: string[];
    cleared: string[];
}

/**
 * Bridges the vulnerability pipeline into the governance checklist: escalates
 * risk-bearing items while severe findings are open, and clears the escalation
 * once they are all closed. Item status is never overwritten — escalation is a
 * separate flag so the owner's own assessment is preserved.
 */
export async function syncRiskFromFindings(organizationId: string): Promise<RiskSyncResult> {
    const openHighCritical = await prisma.vulnerability.count({
        where: {
            organizationId,
            severity: { in: ["CRITICAL", "HIGH"] },
            status: { in: ["OPEN", "IN_PROGRESS"] },
        },
    });

    const items = await prisma.nis2ChecklistItem.findMany({
        where: { organizationId, code: { in: [...RISK_BRIDGE_CODES] } },
    });

    const escalated: string[] = [];
    const cleared: string[] = [];
    const now = new Date();

    for (const item of items) {
        const shouldEscalate = openHighCritical > 0 && item.status !== "NOT_APPLICABLE";

        if (shouldEscalate) {
            const reason = `${openHighCritical} open HIGH/CRITICAL finding${openHighCritical === 1 ? "" : "s"} in the vulnerability pipeline`;
            if (!item.escalated || item.escalationReason !== reason) {
                await prisma.nis2ChecklistItem.update({
                    where: { id: item.id },
                    data: { escalated: true, escalationReason: reason, escalatedAt: item.escalatedAt ?? now },
                });
                escalated.push(item.code);
            }
        } else if (item.escalated) {
            await prisma.nis2ChecklistItem.update({
                where: { id: item.id },
                data: { escalated: false, escalationReason: null, escalatedAt: null },
            });
            cleared.push(item.code);
        }
    }

    return { openHighCritical, escalated, cleared };
}

export function describeMeasure(measure: Nis2Article21Measure) {
    const definition = getMeasureDefinition(measure);
    return `Art. 21(2)(${definition.letter}) — ${definition.label}`;
}
