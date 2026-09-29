import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto/sealed-secrets";
import { getScannerAdapter } from "@/lib/scanners/registry";
import { DEFAULT_SCAN_TIMEOUT_MS, type NormalizedFinding } from "@/lib/scanners/types";

/**
 * Executes a configured scanner against a target and persists the outcome as
 * a ScanResult plus deduplicated Vulnerability rows.
 */

export interface RunScanParams {
    scannerId: string;
    organizationId: string;
    target: string;
    assetId?: string;
    timeoutMs?: number;
}

export interface RunScanOutcome {
    scanResultId: string;
    scanId: string;
    findings: number;
    created: number;
    updated: number;
    hostsScanned: number;
    warnings?: string[];
    /** Vulnerability rows touched by this run, for follow-up AI triage. */
    vulnerabilityIds: string[];
}

/** Stable key for collapsing repeat findings across runs. */
function findingKey(finding: NormalizedFinding): string {
    return `${finding.cveId ?? finding.title}::${finding.location ?? ""}`.toLowerCase();
}

export async function runScan(params: RunScanParams): Promise<RunScanOutcome> {
    const { scannerId, organizationId, target, assetId } = params;

    const scanner = await prisma.scannerConfig.findFirst({
        where: { id: scannerId, organizationId },
    });

    if (!scanner) {
        throw new Error("Scanner not found");
    }
    if (!scanner.isActive) {
        throw new Error(`Scanner '${scanner.name}' is disabled`);
    }

    const adapter = getScannerAdapter(scanner.type);
    if (!adapter) {
        throw new Error(`Scanner type '${scanner.type}' has no integration`);
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = new Date();

    const scanResult = await prisma.scanResult.create({
        data: {
            scanId,
            scannerId: scanner.id,
            organizationId,
            startTime,
            status: "RUNNING",
        },
    });

    try {
        const outcome = await adapter.run(
            { value: target, assetId },
            {
                endpoint: scanner.endpoint,
                // Credentials are sealed at rest; adapters need the plaintext.
                apiKey: decryptSecret(scanner.apiKey),
                username: decryptSecret(scanner.username),
                password: decryptSecret(scanner.password),
                timeoutMs: params.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS,
            },
        );

        // Collapse duplicates within a single run before touching the database.
        const unique = new Map<string, NormalizedFinding>();
        for (const finding of outcome.findings) {
            unique.set(findingKey(finding), finding);
        }

        let created = 0;
        let updated = 0;
        const vulnerabilityIds: string[] = [];

        for (const finding of unique.values()) {
            const existing = await prisma.vulnerability.findFirst({
                where: {
                    organizationId,
                    ...(finding.cveId
                        ? { cveId: finding.cveId }
                        : { title: finding.title, source: scanner.type }),
                },
                select: { id: true },
            });

            const data = {
                title: finding.title.slice(0, 500),
                description: finding.description ?? null,
                severity: finding.severity,
                cveId: finding.cveId ?? null,
                cvssScore: finding.cvssScore ?? null,
                cvssVector: finding.cvssVector ?? null,
                source: scanner.type,
                organizationId,
            };

            if (existing) {
                await prisma.vulnerability.update({ where: { id: existing.id }, data });
                updated += 1;
                vulnerabilityIds.push(existing.id);
            } else {
                const vulnerability = await prisma.vulnerability.create({ data });
                created += 1;
                vulnerabilityIds.push(vulnerability.id);

                // Link the finding to the asset that was scanned, when known.
                if (assetId) {
                    await prisma.assetVulnerability.upsert({
                        where: {
                            assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnerability.id },
                        },
                        create: { assetId, vulnerabilityId: vulnerability.id },
                        update: {},
                    });
                }
            }
        }

        await prisma.scanResult.update({
            where: { id: scanResult.id },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                totalHosts: outcome.hostsScanned,
                totalVulns: unique.size,
                rawData: outcome.raw as Prisma.InputJsonValue,
            },
        });

        await prisma.scannerConfig.update({
            where: { id: scanner.id },
            data: { lastSync: new Date() },
        });

        return {
            scanResultId: scanResult.id,
            scanId,
            findings: unique.size,
            created,
            updated,
            hostsScanned: outcome.hostsScanned,
            warnings: outcome.warnings,
            vulnerabilityIds,
        };
    } catch (error) {
        await prisma.scanResult.update({
            where: { id: scanResult.id },
            data: {
                status: "FAILED",
                endTime: new Date(),
                rawData: {
                    error: error instanceof Error ? error.message : "Unknown error",
                } as Prisma.InputJsonValue,
            },
        });

        throw error;
    }
}
