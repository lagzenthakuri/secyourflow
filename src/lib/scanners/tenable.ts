
import { Severity, VulnSource } from "@prisma/client";

export interface TenableVulnerability {
    id: string;
    title: string;
    description: string;
    severity: Severity;
    cvssScore: number;
    cvssVector?: string;
    cveId?: string;
    assetId: string;
    assetIp?: string;
    assetHostname?: string;
}

export class TenableService {
    private accessKey: string;
    private secretKey: string;
    private baseUrl: string = "https://cloud.tenable.com";

    constructor(accessKey: string, secretKey: string) {
        this.accessKey = accessKey;
        this.secretKey = secretKey;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                "X-ApiKeys": `accessKey=${this.accessKey}; secretKey=${this.secretKey}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Tenable API error: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Fetches scan results from Tenable.io
     * Note: This is a simplified version. In a real scenario, you'd handle pagination and export jobs.
     */
    async getVulnerabilities(scanId?: string): Promise<TenableVulnerability[]> {
        try {
            // If scanId is provided, get specific scan details, else get latest export
            const endpoint = scanId ? `/scans/${scanId}` : "/scans";
            const data = await this.request(endpoint);

            // Map Tenable format to our schema
            // This is a placeholder for the actual mapping logic
            // Tenable.io returns a complex structure; here we simulate some findings
            const vulnerabilities: TenableVulnerability[] = [];

            if (data.vulnerabilities) {
                for (const v of data.vulnerabilities) {
                    vulnerabilities.push({
                        id: v.plugin_id?.toString() || Math.random().toString(),
                        title: v.plugin_name || "Unknown Tenable Finding",
                        description: v.description || "No description provided",
                        severity: this.mapSeverity(v.severity),
                        cvssScore: v.cvss_base_score || 0,
                        cveId: v.cve?.[0],
                        assetId: scanId || "global",
                        assetIp: "0.0.0.0",
                    });
                }
            }

            return vulnerabilities;
        } catch (error) {
            console.error("Failed to fetch Tenable vulnerabilities:", error);
            return [];
        }
    }

    private mapSeverity(tenableSeverity: number | string): Severity {
        const s = tenableSeverity.toString().toLowerCase();
        if (s === "4" || s === "critical") return Severity.CRITICAL;
        if (s === "3" || s === "high") return Severity.HIGH;
        if (s === "2" || s === "medium") return Severity.MEDIUM;
        if (s === "1" || s === "low") return Severity.LOW;
        return Severity.INFORMATIONAL;
    }

    /**
     * Launch a Web Application Scan
     */
    async launchWAS(target: string) {
        // Tenable.io WAS V2 API
        return this.request("/was/v2/scans", {
            method: "POST",
            body: JSON.stringify({
                name: `WAS Scan - ${target}`,
                targets: [target],
            })
        });
    }
}
