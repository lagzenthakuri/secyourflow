import {
    type NormalizedFinding,
    type ScannerAdapter,
    DEFAULT_SCAN_TIMEOUT_MS,
    severityFromLabel,
} from "@/lib/scanners/types";
import {
    ScannerExecError,
    assertValidArtifactTarget,
    binaryAvailable,
    execScanner,
} from "@/lib/scanners/exec";

/**
 * Trivy via the local binary — container images, filesystems, and repositories.
 *
 * Trivy emits real CVE identifiers with fixed-version data, so unlike nmap its
 * output maps directly onto vulnerabilities.
 */

interface TrivyVulnerability {
    VulnerabilityID?: string;
    PkgName?: string;
    InstalledVersion?: string;
    FixedVersion?: string;
    Severity?: string;
    Title?: string;
    Description?: string;
    PrimaryURL?: string;
    References?: string[];
    CVSS?: Record<string, { V3Score?: number; V3Vector?: string }>;
}

interface TrivyResult {
    Target?: string;
    Type?: string;
    Vulnerabilities?: TrivyVulnerability[];
}

interface TrivyReport {
    Results?: TrivyResult[];
}

/** Prefers NVD scoring, then any vendor that supplied a v3 score. */
function cvssFrom(vulnerability: TrivyVulnerability): { score?: number; vector?: string } {
    const sources = vulnerability.CVSS ?? {};
    const preferred = sources.nvd ?? Object.values(sources)[0];
    return { score: preferred?.V3Score, vector: preferred?.V3Vector };
}

export const trivyAdapter: ScannerAdapter = {
    type: "TRIVY",
    label: "Trivy",
    execution: "LOCAL_BINARY",
    binary: "trivy",
    targetHint: "Container image (nginx:1.25), filesystem path, or repository URL",
    requires: {},

    async available() {
        const probe = await binaryAvailable("trivy", ["--version"]);
        return { available: probe.available, version: probe.version, error: probe.error };
    },

    async run(target, config) {
        const value = assertValidArtifactTarget(target.value);
        const timeoutMs = config.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;

        // `image` handles remote refs; `--scanners vuln` skips secret/config
        // scanning so the output maps cleanly onto the vulnerability model.
        const args = [
            "image",
            "--format",
            "json",
            "--quiet",
            "--scanners",
            "vuln",
            "--timeout",
            `${Math.round(timeoutMs / 1000)}s`,
            value,
        ];

        const result = await execScanner("trivy", args, { timeoutMs });

        if (result.timedOut) {
            throw new ScannerExecError(`trivy timed out after ${Math.round(timeoutMs / 1000)}s`);
        }
        if (result.code !== 0) {
            throw new ScannerExecError(
                `trivy exited ${result.code}: ${result.stderr.slice(0, 500) || "no error output"}`,
            );
        }

        let report: TrivyReport;
        try {
            report = JSON.parse(result.stdout) as TrivyReport;
        } catch {
            throw new ScannerExecError("trivy produced output that was not valid JSON");
        }

        const findings: NormalizedFinding[] = [];

        for (const entry of report.Results ?? []) {
            for (const vulnerability of entry.Vulnerabilities ?? []) {
                const { score, vector } = cvssFrom(vulnerability);
                const cveId = vulnerability.VulnerabilityID;

                findings.push({
                    title:
                        vulnerability.Title ||
                        `${cveId ?? "Vulnerability"} in ${vulnerability.PkgName ?? "package"}`,
                    description: [
                        vulnerability.Description?.slice(0, 4000),
                        vulnerability.InstalledVersion
                            ? `Installed: ${vulnerability.PkgName}@${vulnerability.InstalledVersion}`
                            : null,
                    ]
                        .filter(Boolean)
                        .join("\n\n"),
                    // Trivy's own rating is authoritative; CVSS may be absent.
                    severity: severityFromLabel(vulnerability.Severity),
                    cveId: cveId?.startsWith("CVE-") ? cveId : undefined,
                    cvssScore: score,
                    cvssVector: vector,
                    location: `${entry.Target ?? value}:${vulnerability.PkgName ?? "unknown"}`,
                    references: [
                        vulnerability.PrimaryURL,
                        ...(vulnerability.References ?? []),
                    ].filter((url): url is string => Boolean(url)),
                    remediation: vulnerability.FixedVersion
                        ? `Upgrade ${vulnerability.PkgName} to ${vulnerability.FixedVersion} or later.`
                        : "No fixed version published yet; apply compensating controls.",
                });
            }
        }

        return {
            findings,
            hostsScanned: report.Results?.length ?? 0,
            raw: report,
        };
    },
};
