import type { Severity } from "@prisma/client";
import {
    type NormalizedFinding,
    type ScannerAdapter,
    type ScannerRuntimeConfig,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromCvss,
} from "@/lib/scanners/types";
import { fetchWithTimeout } from "@/lib/ai/types";

/**
 * Tenable.io (Tenable Vulnerability Management).
 *
 * Credentials are the pair `accessKey:secretKey` stored in ScannerConfig.apiKey.
 *
 * This replaces `lib/scanner-engine.ts`, which — when the API key was missing
 * or the scanner type was the catch-all "API" — wrote three fabricated CVEs
 * (Heartbleed, an invented CVE-2023-1234, an expired certificate) into the real
 * Vulnerability table, from where they fed the risk and compliance engines.
 * There is no fallback here: no credentials means no scan.
 */

const DEFAULT_ENDPOINT = "https://cloud.tenable.com";

interface TenableAssetRef {
    hostname?: string[];
    ipv4?: string[];
    fqdn?: string[];
}

interface TenableVulnRow {
    plugin?: {
        id?: number;
        name?: string;
        description?: string;
        solution?: string;
        cve?: string[];
        cvss3_base_score?: number;
        cvss3_vector?: string;
        cvss_base_score?: number;
        see_also?: string[];
    };
    severity?: string;
    port?: { port?: number; protocol?: string };
    asset?: TenableAssetRef;
}

/** Tenable severity names take precedence; CVSS is the fallback. */
function severityFromTenable(value: string | undefined, cvss: number | undefined): Severity {
    switch (value?.toLowerCase()) {
        case "critical":
            return "CRITICAL";
        case "high":
            return "HIGH";
        case "medium":
            return "MEDIUM";
        case "low":
            return "LOW";
        case "info":
        case "informational":
            return "INFORMATIONAL";
        default:
            return severityFromCvss(cvss);
    }
}

function splitCredentials(apiKey: string | null | undefined): { accessKey: string; secretKey: string } {
    const [accessKey, secretKey] = (apiKey ?? "").split(":");
    if (!accessKey || !secretKey) {
        throw new Error(
            "Tenable credentials must be stored as 'accessKey:secretKey' on the scanner configuration",
        );
    }
    return { accessKey, secretKey };
}

function headers(config: ScannerRuntimeConfig): Record<string, string> {
    const { accessKey, secretKey } = splitCredentials(config.apiKey);
    return {
        "X-ApiKeys": `accessKey=${accessKey}; secretKey=${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

function baseUrl(config: ScannerRuntimeConfig): string {
    return (config.endpoint?.trim() || DEFAULT_ENDPOINT).replace(/\/+$/, "");
}

/** Maps Tenable workbench rows for one target onto normalized findings. */
export function parseTenableVulnerabilities(rows: TenableVulnRow[]): NormalizedFinding[] {
    const findings: NormalizedFinding[] = [];

    for (const row of rows) {
        const plugin = row.plugin ?? {};
        const cvss = plugin.cvss3_base_score ?? plugin.cvss_base_score;
        const port = row.port?.port;
        const protocol = row.port?.protocol;

        findings.push({
            title: plugin.name || `Tenable plugin ${plugin.id ?? "unknown"}`,
            description: plugin.description,
            severity: severityFromTenable(row.severity, cvss),
            cveId: plugin.cve?.[0],
            cvssScore: cvss,
            cvssVector: plugin.cvss3_vector,
            location: port ? `${protocol ?? "tcp"}/${port}` : undefined,
            references: plugin.see_also,
            remediation: plugin.solution,
        });
    }

    return findings;
}

export const tenableAdapter: ScannerAdapter = {
    type: "TENABLE",
    label: "Tenable Vulnerability Management",
    execution: "REMOTE_API",
    targetHint: "Hostname, FQDN or IPv4 address of an asset already known to Tenable",
    requires: { endpoint: false, apiKey: true },

    async available(config) {
        try {
            splitCredentials(config.apiKey);
        } catch (error) {
            return { available: false, error: error instanceof Error ? error.message : String(error) };
        }

        try {
            const response = await fetchWithTimeout(
                `${baseUrl(config)}/session`,
                { method: "GET", headers: headers(config) },
                10_000,
            );

            if (!response.ok) {
                return { available: false, error: `Tenable responded ${response.status}` };
            }

            return { available: true };
        } catch (error) {
            return { available: false, error: error instanceof Error ? error.message : "Unreachable" };
        }
    },

    async run(target, config) {
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;

        // The workbench endpoint returns the most recent findings Tenable holds
        // for a target. Launching a fresh scan and polling for it is a separate,
        // much longer operation than this adapter's contract allows.
        const url = new URL(`${baseUrl(config)}/workbenches/assets/vulnerabilities`);
        url.searchParams.set("filter.0.filter", "host.target");
        url.searchParams.set("filter.0.quality", "eq");
        url.searchParams.set("filter.0.value", target.value);
        url.searchParams.set("date_range", "30");

        const response = await fetchWithTimeout(
            url.toString(),
            { method: "GET", headers: headers(config) },
            timeoutMs,
        );

        if (!response.ok) {
            throw new Error(`Tenable responded ${response.status}: ${await response.text()}`);
        }

        const payload = (await response.json()) as {
            vulnerabilities?: TenableVulnRow[];
            assets?: unknown[];
        };

        const rows = payload.vulnerabilities ?? [];

        return {
            findings: parseTenableVulnerabilities(rows),
            hostsScanned: Array.isArray(payload.assets) ? payload.assets.length : 1,
            raw: payload,
            warnings:
                rows.length === 0
                    ? [`Tenable holds no findings for '${target.value}' in the last 30 days`]
                    : undefined,
        };
    },
};
