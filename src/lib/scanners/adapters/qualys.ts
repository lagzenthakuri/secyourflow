import {
    type NormalizedFinding,
    type ScannerAdapter,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromCvss,
} from "@/lib/scanners/types";
import { ScannerExecError, assertValidNetworkTarget } from "@/lib/scanners/exec";
import { fetchWithTimeout } from "@/lib/ai/types";

/**
 * Qualys VMDR via the classic API (v2).
 *
 * Qualys authenticates with Basic auth and requires the `X-Requested-With`
 * header on every call. Responses are XML rather than JSON.
 */

function qualysHeaders(username: string, password: string): Record<string, string> {
    return {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        "X-Requested-With": "SecYourFlow",
        "Content-Type": "application/x-www-form-urlencoded",
    };
}

function tag(block: string, name: string): string | undefined {
    const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
    if (!match) return undefined;
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/** Qualys severity runs 1-5; 5 is the most severe. */
function severityFromQualys(level: string | undefined, cvss: number | undefined) {
    switch (level) {
        case "5":
            return "CRITICAL" as const;
        case "4":
            return "HIGH" as const;
        case "3":
            return "MEDIUM" as const;
        case "2":
            return "LOW" as const;
        case "1":
            return "INFORMATIONAL" as const;
        default:
            return severityFromCvss(cvss);
    }
}

/** Parses a Qualys host detection response into normalized findings. */
export function parseQualysDetections(xml: string): NormalizedFinding[] {
    const findings: NormalizedFinding[] = [];
    const hostBlocks = xml.match(/<HOST>[\s\S]*?<\/HOST>/gi) ?? [];

    for (const hostBlock of hostBlocks) {
        const ip = tag(hostBlock, "IP");
        const detections = hostBlock.match(/<DETECTION>[\s\S]*?<\/DETECTION>/gi) ?? [];

        for (const detection of detections) {
            const qid = tag(detection, "QID");
            const severity = tag(detection, "SEVERITY");
            const results = tag(detection, "RESULTS");
            const port = tag(detection, "PORT");
            const protocol = tag(detection, "PROTOCOL");

            findings.push({
                title: `Qualys QID ${qid ?? "unknown"}`,
                description: results?.slice(0, 4000),
                severity: severityFromQualys(severity, undefined),
                location: [ip, port ? `${protocol ?? "tcp"}/${port}` : null]
                    .filter(Boolean)
                    .join(" "),
                references: qid ? [`Qualys QID ${qid}`] : undefined,
            });
        }
    }

    return findings;
}

export const qualysAdapter: ScannerAdapter = {
    type: "QUALYS",
    label: "Qualys VMDR",
    execution: "REMOTE_API",
    targetHint: "IPv4 address or CIDR range already registered in the Qualys subscription",
    requires: { endpoint: true, username: true, password: true },

    async available(config) {
        if (!config.endpoint || !config.username || !config.password) {
            return { available: false, error: "Endpoint, username, and password are required" };
        }

        try {
            const response = await fetchWithTimeout(
                `${config.endpoint.replace(/\/+$/, "")}/api/2.0/fo/portal/version/`,
                { method: "GET", headers: qualysHeaders(config.username, config.password) },
                10_000,
            );

            if (!response.ok) {
                return { available: false, error: `Qualys responded ${response.status}` };
            }

            const xml = await response.text();
            return { available: true, version: tag(xml, "VERSION") };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : "Unreachable",
            };
        }
    },

    async run(target, config) {
        if (!config.endpoint || !config.username || !config.password) {
            throw new ScannerExecError("Qualys endpoint, username, and password are required");
        }

        const value = assertValidNetworkTarget(target.value);
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
        const base = config.endpoint.replace(/\/+$/, "");
        const headers = qualysHeaders(config.username, config.password);

        // Qualys launches are asynchronous and scanner-appliance bound. Rather
        // than provisioning one, pull the latest detections Qualys already
        // holds for the target — the data an assessment actually needs.
        const response = await fetchWithTimeout(
            `${base}/api/2.0/fo/asset/host/vm/detection/`,
            {
                method: "POST",
                headers,
                body: new URLSearchParams({
                    action: "list",
                    ips: value,
                    show_results: "1",
                    status: "New,Active,Re-Opened",
                }).toString(),
            },
            timeoutMs,
        );

        if (!response.ok) {
            throw new ScannerExecError(
                `Qualys detection query failed (${response.status}): ${(await response.text()).slice(0, 300)}`,
            );
        }

        const xml = await response.text();
        const findings = parseQualysDetections(xml);
        const hostsScanned = (xml.match(/<HOST>/gi) ?? []).length;

        return { findings, hostsScanned, raw: { xml: xml.slice(0, 100_000) } };
    },
};
