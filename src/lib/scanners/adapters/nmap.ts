import {
    type NormalizedFinding,
    type ScannerAdapter,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromCvss,
} from "@/lib/scanners/types";
import {
    ScannerExecError,
    assertValidNetworkTarget,
    binaryAvailable,
    execScanner,
} from "@/lib/scanners/exec";

/**
 * Nmap via the local binary.
 *
 * Nmap is a discovery tool, not a vulnerability scanner: it reports open
 * ports and service versions. Those are recorded as INFORMATIONAL findings
 * unless a script (`--script vuln`) attributes a CVE, so nothing is
 * represented as a vulnerability that nmap did not actually assert.
 */

const RISKY_PORTS: Record<number, { title: string; why: string }> = {
    21: { title: "FTP service exposed", why: "FTP transmits credentials in cleartext." },
    23: { title: "Telnet service exposed", why: "Telnet transmits credentials in cleartext." },
    445: { title: "SMB service exposed", why: "SMB should not be reachable from untrusted networks." },
    3389: { title: "RDP service exposed", why: "RDP is a common target for credential attacks." },
    5900: { title: "VNC service exposed", why: "VNC often lacks transport encryption." },
    3306: { title: "MySQL exposed", why: "Database ports should not be publicly reachable." },
    5432: { title: "PostgreSQL exposed", why: "Database ports should not be publicly reachable." },
    6379: { title: "Redis exposed", why: "Redis frequently ships without authentication." },
    9200: { title: "Elasticsearch exposed", why: "Elasticsearch frequently ships without authentication." },
    27017: { title: "MongoDB exposed", why: "MongoDB frequently ships without authentication." },
};

interface NmapPort {
    port: number;
    protocol: string;
    service?: string;
    product?: string;
    version?: string;
}

interface NmapHost {
    ipAddress?: string;
    hostname?: string;
    openPorts: NmapPort[];
}

function attr(block: string, name: string): string | undefined {
    return block.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1];
}

/**
 * Parses the service detail this adapter needs. The discovery parser in
 * `nmap.ts` keeps only port numbers, which is not enough to describe a
 * finding.
 */
export function parseNmapScan(xml: string): NmapHost[] {
    const hostBlocks = xml.match(/<host\b[\s\S]*?<\/host>/gi) ?? [];
    const hosts: NmapHost[] = [];

    for (const block of hostBlocks) {
        if (!/<status[^>]*state="up"/i.test(block)) {
            continue;
        }

        const ipAddress = block.match(
            /<address[^>]*addr="([^"]+)"[^>]*addrtype="ipv4"/i,
        )?.[1];
        const hostname = block.match(/<hostname[^>]*name="([^"]+)"/i)?.[1];

        const openPorts: NmapPort[] = [];
        const portBlocks = block.match(/<port\b[\s\S]*?<\/port>/gi) ?? [];

        for (const portBlock of portBlocks) {
            if (!/<state[^>]*state="open"/i.test(portBlock)) {
                continue;
            }

            const portId = Number(attr(portBlock, "portid"));
            if (!Number.isInteger(portId)) {
                continue;
            }

            const serviceBlock = portBlock.match(/<service\b[^>]*\/?>/i)?.[0] ?? "";

            openPorts.push({
                port: portId,
                protocol: attr(portBlock, "protocol") ?? "tcp",
                service: attr(serviceBlock, "name"),
                product: attr(serviceBlock, "product"),
                version: attr(serviceBlock, "version"),
            });
        }

        hosts.push({ ipAddress, hostname, openPorts });
    }

    return hosts;
}

/** Pulls CVE ids that nmap's vuln scripts attribute to a service. */
function findingsFromScriptOutput(xml: string): NormalizedFinding[] {
    const findings: NormalizedFinding[] = [];
    const scriptRegex = /<script id="([^"]+)" output="([^"]*)"/g;

    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(xml))) {
        const [, scriptId, rawOutput] = match;
        const output = rawOutput.replace(/&#10;/g, "\n").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

        const cves = [...new Set(output.match(/CVE-\d{4}-\d{4,7}/gi) ?? [])];
        for (const cveId of cves) {
            const scoreMatch = output.match(new RegExp(`${cveId}[^\\n]*?(\\d+\\.\\d)`, "i"));
            const cvssScore = scoreMatch ? Number(scoreMatch[1]) : undefined;

            findings.push({
                title: `${cveId} reported by nmap script ${scriptId}`,
                description: output.slice(0, 2000),
                severity: severityFromCvss(cvssScore),
                cveId: cveId.toUpperCase(),
                cvssScore,
                location: scriptId,
            });
        }
    }

    return findings;
}

export const nmapAdapter: ScannerAdapter = {
    type: "NMAP",
    label: "Nmap",
    execution: "LOCAL_BINARY",
    binary: "nmap",
    targetHint: "Hostname, IPv4 address, or CIDR range (e.g. 10.0.0.0/24)",
    requires: {},

    async available() {
        const probe = await binaryAvailable("nmap", ["--version"]);
        return { available: probe.available, version: probe.version, error: probe.error };
    },

    async run(target, config) {
        const value = assertValidNetworkTarget(target.value);
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;

        // -sV service/version detection, -T4 timing, -oX XML to stdout.
        // No -sS: raw sockets need root, and connect scan works unprivileged.
        const args = ["-sV", "-T4", "--open", "-oX", "-", value];

        const result = await execScanner("nmap", args, { timeoutMs });

        if (result.timedOut) {
            throw new ScannerExecError(`nmap timed out after ${Math.round(timeoutMs / 1000)}s`);
        }
        if (result.code !== 0) {
            throw new ScannerExecError(
                `nmap exited ${result.code}: ${result.stderr.slice(0, 500) || "no error output"}`,
            );
        }

        const hosts = parseNmapScan(result.stdout);
        const findings: NormalizedFinding[] = [];

        for (const host of hosts) {
            for (const port of host.openPorts) {
                const risky = RISKY_PORTS[port.port];

                findings.push({
                    title: risky
                        ? `${risky.title} on ${host.ipAddress ?? host.hostname}:${port.port}`
                        : `Open port ${port.port}/${port.protocol} on ${host.ipAddress ?? host.hostname}`,
                    description: [
                        `Service: ${port.service ?? "unknown"}`,
                        port.product ? `Product: ${port.product}` : null,
                        port.version ? `Version: ${port.version}` : null,
                        risky?.why,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                    // Open ports are exposure, not proven vulnerability.
                    severity: risky ? "MEDIUM" : "INFORMATIONAL",
                    location: `${port.protocol}/${port.port}`,
                });
            }
        }

        findings.push(...findingsFromScriptOutput(result.stdout));

        return {
            findings,
            hostsScanned: hosts.length,
            raw: { hosts, stderr: result.stderr.slice(0, 4000) },
            warnings: result.stderr.trim() ? [result.stderr.trim().slice(0, 500)] : undefined,
        };
    },
};
