import {
    type NormalizedFinding,
    type ScannerAdapter,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromCvss,
} from "@/lib/scanners/types";
import { ScannerExecError, assertValidNetworkTarget } from "@/lib/scanners/exec";
import { fetchWithTimeout } from "@/lib/ai/types";

/**
 * Tenable Nessus via its REST API.
 *
 * Authentication uses the `accessKey;secretKey` pair stored on the scanner
 * config's apiKey field, matching Nessus's `X-ApiKeys` header format.
 */

interface NessusPlugin {
    plugin_id?: number;
    plugin_name?: string;
    severity?: number;
    description?: string;
    solution?: string;
    cve?: string[];
    cvss3_base_score?: number;
    cvss3_vector?: string;
    port?: number;
    protocol?: string;
    hostname?: string;
}

/** Nessus severity is 0-4; map it rather than inferring from CVSS alone. */
function severityFromNessus(level: number | undefined, cvss: number | undefined) {
    switch (level) {
        case 4:
            return "CRITICAL" as const;
        case 3:
            return "HIGH" as const;
        case 2:
            return "MEDIUM" as const;
        case 1:
            return "LOW" as const;
        case 0:
            return "INFORMATIONAL" as const;
        default:
            return severityFromCvss(cvss);
    }
}

function authHeaders(apiKey: string): Record<string, string> {
    const [accessKey, secretKey] = apiKey.split(";");
    if (!accessKey || !secretKey) {
        throw new ScannerExecError(
            "Nessus API key must be in the form 'accessKey;secretKey'",
        );
    }
    return {
        "X-ApiKeys": `accessKey=${accessKey}; secretKey=${secretKey}`,
        "Content-Type": "application/json",
    };
}

export const nessusAdapter: ScannerAdapter = {
    type: "NESSUS",
    label: "Tenable Nessus",
    execution: "REMOTE_API",
    targetHint: "Hostname, IPv4 address, or CIDR range reachable by the Nessus scanner",
    requires: { endpoint: true, apiKey: true },

    async available(config) {
        if (!config.endpoint || !config.apiKey) {
            return { available: false, error: "Endpoint and API key are required" };
        }

        try {
            const response = await fetchWithTimeout(
                `${config.endpoint.replace(/\/+$/, "")}/server/status`,
                { method: "GET", headers: authHeaders(config.apiKey) },
                10_000,
            );

            if (!response.ok) {
                return { available: false, error: `Nessus responded ${response.status}` };
            }

            const data = (await response.json()) as { status?: string };
            return { available: data.status === "ready", version: data.status };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : "Unreachable",
            };
        }
    },

    async run(target, config) {
        if (!config.endpoint || !config.apiKey) {
            throw new ScannerExecError("Nessus endpoint and API key are required");
        }

        const value = assertValidNetworkTarget(target.value);
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
        const base = config.endpoint.replace(/\/+$/, "");
        const headers = authHeaders(config.apiKey);

        // "Basic Network Scan" is the stock policy template.
        const createResponse = await fetchWithTimeout(
            `${base}/scans`,
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    uuid: "731a8e52-3ea6-a291-ec0a-d2ff0619c19d7bd788d6be818b65",
                    settings: {
                        name: `secyourflow-${Date.now()}`,
                        enabled: false,
                        text_targets: value,
                    },
                }),
            },
            timeoutMs,
        );

        if (!createResponse.ok) {
            throw new ScannerExecError(
                `Nessus scan creation failed (${createResponse.status}): ${(await createResponse.text()).slice(0, 300)}`,
            );
        }

        const created = (await createResponse.json()) as { scan?: { id?: number } };
        const scanId = created.scan?.id;
        if (!scanId) {
            throw new ScannerExecError("Nessus did not return a scan id");
        }

        await fetchWithTimeout(`${base}/scans/${scanId}/launch`, { method: "POST", headers }, 30_000);

        interface NessusScanDetail {
            info?: { status?: string };
            vulnerabilities?: NessusPlugin[];
        }

        const deadline = Date.now() + timeoutMs;
        let detail: NessusScanDetail | null = null;

        while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 15_000));

            const statusResponse = await fetchWithTimeout(
                `${base}/scans/${scanId}`,
                { method: "GET", headers },
                30_000,
            );

            if (!statusResponse.ok) {
                continue;
            }

            detail = (await statusResponse.json()) as NessusScanDetail;
            const status = detail?.info?.status;

            if (status === "completed") break;
            if (status === "canceled" || status === "aborted") {
                throw new ScannerExecError(`Nessus scan ended with status ${status}`);
            }
            detail = null;
        }

        if (!detail) {
            throw new ScannerExecError(
                `Nessus scan did not finish within ${Math.round(timeoutMs / 1000)}s`,
            );
        }

        const findings: NormalizedFinding[] = (detail.vulnerabilities ?? []).map((plugin) => ({
            title: plugin.plugin_name ?? `Nessus plugin ${plugin.plugin_id}`,
            description: plugin.description?.slice(0, 4000),
            severity: severityFromNessus(plugin.severity, plugin.cvss3_base_score),
            cveId: plugin.cve?.[0],
            cvssScore: plugin.cvss3_base_score,
            cvssVector: plugin.cvss3_vector,
            location:
                plugin.port !== undefined
                    ? `${plugin.protocol ?? "tcp"}/${plugin.port}`
                    : plugin.hostname,
            remediation: plugin.solution,
        }));

        return { findings, hostsScanned: 1, raw: detail };
    },
};
