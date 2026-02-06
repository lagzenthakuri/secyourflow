
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { processRiskAssessment } from "@/lib/risk-engine";
import { Severity, VulnSource, VulnStatus, ScanStatus } from "@prisma/client";

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

/**
 * Uses OpenRouter LLM to "scan" an asset and identify potential vulnerabilities.
 */
export async function runAIScan(assetId: string, apiKey?: string, model: string = "google/gemini-2.0-flash-001") {
    const finalApiKey = apiKey || process.env.OPENROUTER_API_KEY;

    if (!finalApiKey) {
        throw new Error("OpenRouter API Key not provided and not found in environment.");
    }

    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
    });

    if (!asset) {
        throw new Error("Asset not found");
    }

    // 1. Create a Scan Result record
    const scanner = await prisma.scannerConfig.findFirst({
        where: { type: "API", name: "AI AI-Scanner" }
    }) || await prisma.scannerConfig.create({
        data: {
            name: "AI AI-Scanner",
            type: "API",
            isActive: true,
        }
    });

    const scanRecord = await prisma.scanResult.create({
        data: {
            scanId: `SCN-${Date.now()}`,
            scannerId: scanner.id,
            status: "RUNNING",
            startTime: new Date(),
            totalHosts: 1,
        }
    });

    try {
        const prompt = `
        You are an advanced Vulnerability Scanner. Perform a comprehensive AI-based scan on the following asset.
        
        ASSET DETAILS:
        - Name: ${asset.name}
        - Type: ${asset.type}
        - IP Address: ${asset.ipAddress || "Unknown"}
        - Hostname: ${asset.hostname || "Unknown"}
        - OS: ${asset.operatingSystem || "Unknown"}
        - Environment: ${asset.environment}
        - Criticality: ${asset.criticality}
        
        Predict potential vulnerabilities for this asset based on its characteristics, common security flaws in such technologies, and standard threat landscapes.
        
        Return the findings as a JSON object with an array of vulnerabilities.
        For each vulnerability, include:
        - title: Short descriptive name
        - description: Detailed description of what the vulnerability is and how it affects this specific asset
        - severity: CRITICAL, HIGH, MEDIUM, LOW, or INFORMATIONAL
        - cveId: (Optional) Mention a related real-world CVE if highly relevant
        - cvssScore: (Optional) Estimated CVSS v3 score (0.0 to 10.0)
        - solution: Recommended remediation steps
        - isExploited: (Boolean) True if there is evidence of active exploitation in the wild
        - cisaKev: (Boolean) True if this is likely a CISA Known Exploited Vulnerability
        
        Format your response ONLY as valid JSON like this:
        {
            "vulnerabilities": [
                {
                    "title": "...",
                    "description": "...",
                    "severity": "...",
                    "cveId": "...",
                    "cvssScore": 8.5,
                    "solution": "...",
                    "isExploited": false,
                    "cisaKev": false
                }
            ]
        }
        `;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${finalApiKey}`,
                "HTTP-Referer": `https://secyourflow.com`,
                "X-Title": `SecYourFlow`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": model,
                "messages": [
                    { "role": "system", "content": "You are a professional cybersecurity scanner. You analyze assets and report vulnerabilities in structured JSON format." },
                    { "role": "user", "content": prompt }
                ],
                "response_format": { "type": "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`OpenRouter API error: ${JSON.stringify(errData)}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);
        const findings: FoundVulnerability[] = result.vulnerabilities || [];

        // 2. Process Findings
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        for (const finding of findings) {
            // Check if vulnerability already exists (simplified check)
            let vulnerability = await prisma.vulnerability.findFirst({
                where: {
                    title: finding.title,
                    organizationId: org.id
                }
            });

            if (!vulnerability) {
                vulnerability = await prisma.vulnerability.create({
                    data: {
                        title: finding.title,
                        description: finding.description,
                        severity: finding.severity as Severity,
                        cveId: finding.cveId,
                        cvssScore: finding.cvssScore,
                        solution: finding.solution,
                        isExploited: finding.isExploited || false,
                        cisaKev: finding.cisaKev || false,
                        source: "API",
                        status: "OPEN",
                        organizationId: org.id,
                        assets: {
                            create: {
                                assetId: asset.id,
                                status: "OPEN"
                            }
                        }
                    }
                });
            } else {
                // Link existing vuln to this asset if not already linked
                await prisma.assetVulnerability.upsert({
                    where: {
                        assetId_vulnerabilityId: {
                            assetId: asset.id,
                            vulnerabilityId: vulnerability.id
                        }
                    },
                    create: {
                        assetId: asset.id,
                        vulnerabilityId: vulnerability.id,
                        status: "OPEN"
                    },
                    update: {
                        lastSeen: new Date()
                    }
                });
            }

            // 3. Trigger Risk Assessment for each finding
            processRiskAssessment(vulnerability.id, asset.id, org.id).catch(err =>
                console.error(`[ScannerEngine] Risk Assessment failed for ${vulnerability!.id}:`, err)
            );
        }

        // 4. Update Scan Record
        await prisma.scanResult.update({
            where: { id: scanRecord.id },
            data: {
                status: "COMPLETED",
                endTime: new Date(),
                totalVulns: findings.length,
                rawData: result
            }
        });

        await logActivity(
            "SCAN_COMPLETED",
            "Asset",
            asset.id,
            null,
            { scanId: scanRecord.id, vulnsFound: findings.length },
            `AI Scan completed for ${asset.name}. ${findings.length} vulnerabilities found.`
        );

        return {
            scanId: scanRecord.id,
            vulnerabilitiesFound: findings.length,
            findings
        };

    } catch (error: any) {
        console.error("[ScannerEngine] Scan failed:", error);
        await prisma.scanResult.update({
            where: { id: scanRecord.id },
            data: {
                status: "FAILED",
                endTime: new Date(),
            }
        });
        throw error;
    }
}
