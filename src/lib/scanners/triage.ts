import { prisma } from "@/lib/prisma";
import { getAdapter, resolveAiConfig } from "@/lib/ai";
import { processRiskAssessment } from "@/lib/risk-engine";
import { notifyMainOfficers } from "@/lib/notifications/service";

/**
 * Post-scan AI triage.
 *
 * Scanning produces facts; triage turns them into risk entries with scoring,
 * control mappings, and remediation steps using the organization's configured
 * AI provider. It runs after the scan response has been sent because a local
 * model takes seconds per finding.
 */

export interface TriageParams {
    organizationId: string;
    vulnerabilityIds: string[];
    /** Asset the scan was aimed at, when the caller already knows it. */
    assetId?: string;
    /** Scan target, used to resolve an asset when none was supplied. */
    target?: string;
    userId?: string;
    /** Parallel analyses. Kept low — a local model is easily saturated. */
    concurrency?: number;
}

export interface TriageOutcome {
    analyzed: number;
    /** Scored, but by the deterministic model because the AI did not answer. */
    fellBack: number;
    failed: number;
    skipped: number;
    reason?: string;
    provider?: string;
    model?: string;
    durationMs: number;
}

const DEFAULT_CONCURRENCY = 2;

/**
 * Risk is a property of a vulnerability *on an asset*, so triage needs one.
 * Falls back to matching the scan target against known assets.
 */
async function resolveAssetId(params: TriageParams): Promise<string | null> {
    if (params.assetId) {
        return params.assetId;
    }

    const target = params.target?.trim();
    if (!target) {
        return null;
    }

    const asset = await prisma.asset.findFirst({
        where: {
            organizationId: params.organizationId,
            OR: [{ ipAddress: target }, { hostname: target }, { name: target }],
        },
        select: { id: true },
    });

    return asset?.id ?? null;
}

/** Runs tasks with a fixed worker pool, isolating per-item failures. */
async function runPooled<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
    let cursor = 0;
    let ok = 0;
    let failed = 0;

    const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (cursor < items.length) {
            const item = items[cursor++];
            try {
                await worker(item);
                ok += 1;
            } catch (error) {
                failed += 1;
                console.error(
                    "[Triage] analysis failed:",
                    error instanceof Error ? error.message : error,
                );
            }
        }
    });

    await Promise.all(workers);
    return { ok, failed };
}

export async function triageScanFindings(params: TriageParams): Promise<TriageOutcome> {
    const started = Date.now();
    const base = { analyzed: 0, fellBack: 0, failed: 0, skipped: params.vulnerabilityIds.length };

    if (params.vulnerabilityIds.length === 0) {
        return { ...base, skipped: 0, reason: "No findings to analyze", durationMs: 0 };
    }

    // Respect the organization's provider choice and enabled flag.
    const aiConfig = await resolveAiConfig(params.organizationId);
    if (!aiConfig) {
        return {
            ...base,
            reason: "AI analysis is disabled or no provider is configured",
            durationMs: Date.now() - started,
        };
    }

    const assetId = await resolveAssetId(params);
    if (!assetId) {
        return {
            ...base,
            reason: `No asset matches the scan target${params.target ? ` '${params.target}'` : ""}; risk analysis needs an asset`,
            provider: aiConfig.provider,
            model: aiConfig.model,
            durationMs: Date.now() - started,
        };
    }

    // A self-hosted model serves requests from one pool of compute, so running
    // two at once does not halve the wall clock — it just makes each slower and
    // risks tripping the per-request timeout. Hosted APIs do parallelize.
    const concurrency =
        params.concurrency ?? (getAdapter(aiConfig.provider)?.selfHosted ? 1 : DEFAULT_CONCURRENCY);

    let fellBack = 0;

    const { ok, failed } = await runPooled(
        params.vulnerabilityIds,
        concurrency,
        async (vulnerabilityId) => {
            const result = await processRiskAssessment(
                vulnerabilityId,
                assetId,
                params.organizationId,
                params.userId,
            );
            if (!result?.usedAi) {
                fellBack += 1;
            }
        },
    );

    return {
        analyzed: ok,
        fellBack,
        failed,
        skipped: 0,
        provider: aiConfig.provider,
        model: aiConfig.model,
        durationMs: Date.now() - started,
    };
}

/**
 * Triage wrapper for background execution: never throws, and tells the team
 * what happened since nobody is watching the original request.
 */
export async function triageInBackground(params: TriageParams & { scannerName?: string }) {
    try {
        const outcome = await triageScanFindings(params);

        if (outcome.analyzed === 0 && outcome.reason) {
            console.warn(`[Triage] skipped: ${outcome.reason}`);
            return outcome;
        }

        const seconds = Math.round(outcome.durationMs / 1000);
        await notifyMainOfficers(
            params.organizationId,
            "Scan findings analyzed",
            `${outcome.analyzed} finding${outcome.analyzed === 1 ? "" : "s"} from ${params.scannerName ?? "the last scan"} ` +
                `scored in ${seconds}s using ${outcome.provider}/${outcome.model}` +
                // Never imply the model did work it did not do.
                (outcome.fellBack > 0
                    ? `. ${outcome.fellBack} fell back to deterministic scoring because the model did not respond.`
                    : ".") +
                (outcome.failed > 0 ? ` ${outcome.failed} could not be scored at all.` : ""),
            "/risk-register",
        );

        return outcome;
    } catch (error) {
        console.error(
            "[Triage] background run failed:",
            error instanceof Error ? error.message : error,
        );
        return null;
    }
}
