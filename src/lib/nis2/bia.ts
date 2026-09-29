import type { Nis2BusinessProcess, Nis2ProcessCriticality } from "@prisma/client";

/**
 * Business Impact Analysis supporting Art. 21(2)(c) — business continuity,
 * backup management, disaster recovery, and crisis management.
 */

export const IMPACT_DIMENSIONS = [
    { key: "financialImpact", label: "Financial", weight: 1.0 },
    { key: "operationalImpact", label: "Operational", weight: 1.0 },
    { key: "reputationalImpact", label: "Reputational", weight: 0.8 },
    { key: "regulatoryImpact", label: "Regulatory", weight: 1.2 },
    { key: "safetyImpact", label: "Safety", weight: 1.5 },
] as const;

export type ImpactDimensionKey = (typeof IMPACT_DIMENSIONS)[number]["key"];

/** Each dimension is rated 1 (negligible) to 5 (catastrophic). */
export const IMPACT_SCALE_MIN = 1;
export const IMPACT_SCALE_MAX = 5;

const TOTAL_WEIGHT = IMPACT_DIMENSIONS.reduce((sum, dimension) => sum + dimension.weight, 0);

export type ScorableProcess = Pick<
    Nis2BusinessProcess,
    ImpactDimensionKey | "criticality" | "rtoHours" | "rpoHours" | "mtpdHours" | "bcpDocumented" | "drpDocumented" | "lastTestedAt"
>;

/**
 * Weighted mean of the five dimensions, normalised to 0-100. Safety and
 * regulatory impact carry more weight because NIS2 exists to protect service
 * continuity and public interest, not just the balance sheet.
 */
export function computeImpactScore(process: Pick<ScorableProcess, ImpactDimensionKey>): number {
    const weighted = IMPACT_DIMENSIONS.reduce(
        (sum, dimension) => sum + process[dimension.key] * dimension.weight,
        0,
    );
    const normalised = (weighted / (TOTAL_WEIGHT * IMPACT_SCALE_MAX)) * 100;
    return Math.round(normalised * 10) / 10;
}

export type BiaGapSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

export interface BiaGap {
    code: string;
    severity: BiaGapSeverity;
    message: string;
}

/** How stale a continuity test may be before it stops counting as evidence. */
const CONTINUITY_TEST_MAX_AGE_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

const HIGH_CRITICALITY: readonly Nis2ProcessCriticality[] = ["VITAL", "CRITICAL"];

/**
 * Detects the continuity gaps an auditor would ask about: missing recovery
 * objectives, undocumented plans, incoherent RTO/MTPD, and untested recovery.
 */
export function detectGaps(process: ScorableProcess, now = new Date()): BiaGap[] {
    const gaps: BiaGap[] = [];
    const isCritical = HIGH_CRITICALITY.includes(process.criticality);

    if (process.rtoHours === null) {
        gaps.push({
            code: "MISSING_RTO",
            severity: isCritical ? "CRITICAL" : "MEDIUM",
            message: "No Recovery Time Objective defined.",
        });
    }
    if (process.rpoHours === null) {
        gaps.push({
            code: "MISSING_RPO",
            severity: isCritical ? "CRITICAL" : "MEDIUM",
            message: "No Recovery Point Objective defined.",
        });
    }
    if (process.mtpdHours === null) {
        gaps.push({
            code: "MISSING_MTPD",
            severity: isCritical ? "HIGH" : "MEDIUM",
            message: "No Maximum Tolerable Period of Disruption defined.",
        });
    }

    // RTO must leave headroom before the business becomes unviable.
    if (process.rtoHours !== null && process.mtpdHours !== null && process.rtoHours >= process.mtpdHours) {
        gaps.push({
            code: "RTO_EXCEEDS_MTPD",
            severity: "CRITICAL",
            message: `RTO (${process.rtoHours}h) is not shorter than MTPD (${process.mtpdHours}h) — recovery would complete only after the process becomes unviable.`,
        });
    }

    if (!process.bcpDocumented) {
        gaps.push({
            code: "NO_BCP",
            severity: isCritical ? "CRITICAL" : "MEDIUM",
            message: "No documented business continuity plan.",
        });
    }
    if (!process.drpDocumented) {
        gaps.push({
            code: "NO_DRP",
            severity: isCritical ? "HIGH" : "MEDIUM",
            message: "No documented disaster recovery plan.",
        });
    }

    if (process.bcpDocumented || process.drpDocumented) {
        if (!process.lastTestedAt) {
            gaps.push({
                code: "NEVER_TESTED",
                severity: isCritical ? "HIGH" : "MEDIUM",
                message: "Continuity plans exist but have never been tested.",
            });
        } else {
            const ageDays = Math.floor((now.getTime() - process.lastTestedAt.getTime()) / DAY_MS);
            if (ageDays > CONTINUITY_TEST_MAX_AGE_DAYS) {
                gaps.push({
                    code: "TEST_STALE",
                    severity: isCritical ? "HIGH" : "MEDIUM",
                    message: `Last continuity test was ${ageDays} days ago — beyond the ${CONTINUITY_TEST_MAX_AGE_DAYS}-day review cycle.`,
                });
            }
        }
    }

    return gaps;
}

export interface BiaSummary {
    totalProcesses: number;
    vital: number;
    critical: number;
    withoutBcp: number;
    withoutDrp: number;
    untested: number;
    averageImpactScore: number;
    /** Gap counts keyed by severity across every process. */
    gapsBySeverity: Record<BiaGapSeverity, number>;
    /** Processes carrying at least one CRITICAL gap. */
    processesAtRisk: number;
}

export function summarizeBia(processes: ScorableProcess[], now = new Date()): BiaSummary {
    const gapsBySeverity: Record<BiaGapSeverity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0 };
    let processesAtRisk = 0;
    let impactTotal = 0;

    for (const process of processes) {
        const gaps = detectGaps(process, now);
        for (const gap of gaps) {
            gapsBySeverity[gap.severity] += 1;
        }
        if (gaps.some((gap) => gap.severity === "CRITICAL")) {
            processesAtRisk += 1;
        }
        impactTotal += computeImpactScore(process);
    }

    return {
        totalProcesses: processes.length,
        vital: processes.filter((process) => process.criticality === "VITAL").length,
        critical: processes.filter((process) => process.criticality === "CRITICAL").length,
        withoutBcp: processes.filter((process) => !process.bcpDocumented).length,
        withoutDrp: processes.filter((process) => !process.drpDocumented).length,
        untested: processes.filter((process) => process.lastTestedAt === null).length,
        averageImpactScore: processes.length ? Math.round((impactTotal / processes.length) * 10) / 10 : 0,
        gapsBySeverity,
        processesAtRisk,
    };
}
