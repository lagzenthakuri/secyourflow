
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { processRiskAssessment } from "@/lib/risk-engine";
import { Severity, VulnSource, VulnStatus, ScanStatus } from "@prisma/client";
import { TenableService } from "./scanners/tenable";

interface FoundVulnerability {
    title: string;
    description: string;
    severity: Severity;
    cveId?: string;
    cvssScore?: number;
    solution?: string;
    isExploited?: boolean;
    cisaKev?: boolean;
}

// Removed runAIScan as requested. AI is only used for detailing results, not for scanning.

/**
 * Runs a Tenable scan and uses AI to provide deep insights for each finding.
 */
export async function runTenableScan(assetId: string, scannerId: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error("Asset not found");

    const scannerConfig = await prisma.scannerConfig.findUnique({ where: { id: scannerId } });
    if (!scannerConfig || !scannerConfig.apiKey) throw new Error("Scanner config or API key missing");

    // In Tenable, the apiKey is usually accessKey:secretKey
    const apiKeyParts = scannerConfig.apiKey.split(":");
    const accessKey = apiKeyParts[0];
    const secretKey = apiKeyParts[1] || "";
    const tenable = new TenableService(accessKey, secretKey);

    const scanRecord = await prisma.scanResult.create({
        data: {
            scanId: `TEN-${Date.now()}`,
            scannerId: scannerId,
            status: "RUNNING",
            startTime: new Date(),
            totalHosts: 1,
        }
    });

    try {
        // 1. Fetch raw findings from Tenable (NO AI FOR SCANNING)
        const tenableFindings = await tenable.getVulnerabilities();

        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        for (const finding of tenableFindings) {
            // 2. Use AI for giving details of the result (AS REQUESTED)
            const aiDetails = await getAIDetailsForResult(finding, asset);

            const vulnerability = await prisma.vulnerability.upsert({
                where: { id: `TEN-${finding.id}` }, // Using stable ID
                create: {
                    id: `TEN-${finding.id}`,
                    title: finding.title,
                    description: aiDetails.description || finding.description,
                    severity: finding.severity,
                    cvssScore: finding.cvssScore,
                    cveId: finding.cveId,
                    solution: aiDetails.remediation || "Follow Tenable recommendations",
                    source: "TENABLE" as any,
                    status: "OPEN",
                    organizationId: org.id,
                    metadata: { ai_enhanced: true, original_description: finding.description },
                    assets: {
                        create: {
                            assetId: asset.id,
                            status: "OPEN"
                        }
                    }
                },
                update: {
                    lastSeen: new Date(),
                    description: aiDetails.description || finding.description,
                    solution: aiDetails.remediation || "Follow Tenable recommendations",
                }
            });

            // 3. Trigger Risk Assessment (which uses AI for control recommendations)
            processRiskAssessment(vulnerability.id, asset.id, org.id).catch(console.error);
        }

        await prisma.scanResult.update({
            where: { id: scanRecord.id },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                totalVulns: tenableFindings.length,
                rawData: { findings: tenableFindings } as any
            }
        });

        return { scanId: scanRecord.id, vulnsFound: tenableFindings.length };

    } catch (error) {
        await prisma.scanResult.update({
            where: { id: scanRecord.id },
            data: { status: "FAILED", endTime: new Date() }
        });
        throw error;
    }
}

/**
 * Uses AI to provide deep insights and context for a specific scan finding.
 */
async function getAIDetailsForResult(finding: any, asset: any) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { description: finding.description, remediation: "" };

    const prompt = `
    Analyze this security finding from Tenable for this specific asset.
    Asset: ${asset.name} (${asset.type}, ${asset.operatingSystem || 'Unknown OS'})
    Finding: ${finding.title}
    Original Description: ${finding.description}
    CVE: ${finding.cveId || 'N/A'}

    Please provide:
    1. An enhanced, business-centric description of the risk.
    2. Specific remediation steps tailored for a ${asset.operatingSystem || 'this type of'} system.
    3. Potential impact if exploited on a ${asset.environment} environment.

    Format as JSON:
    {
        "description": "...",
        "remediation": "...",
        "impact_analysis": "..."
    }
    `;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [{ "role": "user", "content": prompt }],
                "response_format": { "type": "json_object" }
            })
        });
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (e) {
        return { description: finding.description, remediation: "" };
    }
}
