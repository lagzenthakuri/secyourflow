import {
    type NormalizedFinding,
    type ScannerAdapter,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromCvss,
} from "@/lib/scanners/types";
import { ScannerExecError, assertValidNetworkTarget } from "@/lib/scanners/exec";
import { fetchWithTimeout } from "@/lib/ai/types";

/**
 * OpenVAS / Greenbone via the GMP HTTP bridge.
 *
 * Greenbone's native GMP protocol speaks XML over TLS socket. This adapter
 * targets `gvmd`'s HTTP endpoint (gsad), which accepts the same GMP documents
 * over POST — the deployment shape most reachable from a web application.
 */

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function gmpRequest(
    endpoint: string,
    username: string,
    password: string,
    command: string,
    timeoutMs: number,
): Promise<string> {
    const base = endpoint.replace(/\/+$/, "");

    const response = await fetchWithTimeout(
        `${base}/gmp`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/xml",
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
            },
            body: command,
        },
        timeoutMs,
    );

    if (!response.ok) {
        throw new ScannerExecError(
            `Greenbone responded ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
    }

    return response.text();
}

function attr(block: string, name: string): string | undefined {
    return block.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1];
}

function tag(block: string, name: string): string | undefined {
    return block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1];
}

/** Parses a GMP `get_results` response into normalized findings. */
export function parseGmpResults(xml: string): NormalizedFinding[] {
    const findings: NormalizedFinding[] = [];
    const blocks = xml.match(/<result\b[\s\S]*?<\/result>/gi) ?? [];

    for (const block of blocks) {
        const name = tag(block, "name") ?? "Greenbone finding";
        const description = tag(block, "description");
        const host = tag(block, "host")?.split("<")[0]?.trim();
        const port = tag(block, "port");
        const severityValue = Number(tag(block, "severity"));

        const nvtBlock = block.match(/<nvt\b[\s\S]*?<\/nvt>/i)?.[0] ?? "";
        const oid = attr(nvtBlock, "oid");
        const refs = [...(nvtBlock.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])];

        findings.push({
            title: name,
            description: description?.slice(0, 4000),
            severity: severityFromCvss(Number.isFinite(severityValue) ? severityValue : undefined),
            cveId: refs[0]?.toUpperCase(),
            cvssScore: Number.isFinite(severityValue) ? severityValue : undefined,
            location: [host, port].filter(Boolean).join(":") || undefined,
            references: oid ? [`NVT OID ${oid}`] : undefined,
        });
    }

    return findings;
}

export const openvasAdapter: ScannerAdapter = {
    type: "OPENVAS",
    label: "OpenVAS / Greenbone",
    execution: "REMOTE_API",
    targetHint: "Hostname, IPv4 address, or CIDR range known to the Greenbone instance",
    requires: { endpoint: true, username: true, password: true },

    async available(config) {
        if (!config.endpoint || !config.username || !config.password) {
            return { available: false, error: "Endpoint, username, and password are required" };
        }

        try {
            const xml = await gmpRequest(
                config.endpoint,
                config.username,
                config.password,
                "<get_version/>",
                10_000,
            );
            const version = tag(xml, "version");
            return { available: xml.includes("get_version_response"), version };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : "Unreachable",
            };
        }
    },

    async run(target, config) {
        if (!config.endpoint || !config.username || !config.password) {
            throw new ScannerExecError("Greenbone endpoint, username, and password are required");
        }

        const value = assertValidNetworkTarget(target.value);
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
        const { endpoint, username, password } = config;

        // Greenbone models a scan as target -> task -> report. Reuse of an
        // existing target is avoided so a run never widens someone else's scope.
        const targetXml = await gmpRequest(
            endpoint,
            username,
            password,
            `<create_target><name>secyourflow-${Date.now()}</name><hosts>${escapeXml(value)}</hosts></create_target>`,
            timeoutMs,
        );

        const targetId = attr(targetXml, "id");
        if (!targetId) {
            throw new ScannerExecError(`Greenbone did not return a target id: ${targetXml.slice(0, 300)}`);
        }

        // "Full and fast" is Greenbone's stock config id.
        const taskXml = await gmpRequest(
            endpoint,
            username,
            password,
            `<create_task><name>secyourflow-${Date.now()}</name>` +
                `<config id="daba56c8-73ec-11df-a475-002264764cea"/>` +
                `<target id="${targetId}"/></create_task>`,
            timeoutMs,
        );

        const taskId = attr(taskXml, "id");
        if (!taskId) {
            throw new ScannerExecError(`Greenbone did not return a task id: ${taskXml.slice(0, 300)}`);
        }

        await gmpRequest(endpoint, username, password, `<start_task task_id="${taskId}"/>`, timeoutMs);

        // Poll until the task reports Done or the caller's budget expires.
        const deadline = Date.now() + timeoutMs;
        let reportId: string | undefined;

        while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 15_000));

            const statusXml = await gmpRequest(
                endpoint,
                username,
                password,
                `<get_tasks task_id="${taskId}"/>`,
                30_000,
            );

            const status = tag(statusXml, "status");
            if (status === "Done") {
                reportId = attr(statusXml.match(/<last_report\b[\s\S]*?<\/last_report>/i)?.[0] ?? "", "id");
                break;
            }
            if (status === "Stopped" || status === "Interrupted") {
                throw new ScannerExecError(`Greenbone task ended with status ${status}`);
            }
        }

        if (!reportId) {
            throw new ScannerExecError(
                `Greenbone scan did not finish within ${Math.round(timeoutMs / 1000)}s`,
            );
        }

        const resultsXml = await gmpRequest(
            endpoint,
            username,
            password,
            `<get_results report_id="${reportId}" details="1"/>`,
            timeoutMs,
        );

        const findings = parseGmpResults(resultsXml);

        return {
            findings,
            hostsScanned: 1,
            raw: { taskId, reportId, resultsXml: resultsXml.slice(0, 100_000) },
        };
    },
};
