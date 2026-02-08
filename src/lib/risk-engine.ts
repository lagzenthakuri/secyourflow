
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { updateComplianceFromRisk } from "@/lib/compliance-engine";

// Type definition for the AI Risk Analysis Output
interface AIRiskAnalysis {
    c_impact: number; // 1-5
    i_impact: number; // 1-5
    a_impact: number; // 1-5
    likelihood: number; // 1-5
    summary: string; // "Unauthorized access...", etc.
    rationale: string;
    affectedControls: string[]; // List of Control IDs (e.g., ISO-27001-A.9.2.1)
}

/**
 * Calls the OpenRouter LLM API to analyze risk.
 */
async function analyzeRiskWithAI(
    vulnerability: any,
    asset: any
): Promise<any> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        console.warn("[RiskEngine] OPENROUTER_API_KEY is not set. Falling back to mock analysis.");
        return mockAnalysis(vulnerability, asset);
    }

    const prompt = `
Evaluate the risk of this vulnerability on this asset. 
Asset Info: 
- Type: ${asset.type}
- Name: ${asset.name}
- Environment: ${asset.environment}
- Criticality: ${asset.criticality}
- Owner: ${asset.owner || 'Unknown'}

Vulnerability Info:
- Title: ${vulnerability.title}
- CVE: ${vulnerability.cveId || 'N/A'}
- CVSS: ${vulnerability.cvssScore || 'N/A'}
- Severity: ${vulnerability.severity}
- Description: ${vulnerability.description || 'N/A'}

Business Context:
- Organization criticality: High
- Regulatory exposure: GDPR, ISO 27001

Give likelihood (1-5), impact CIA (1-5 each), risk category, rationale, recommended controls, and ISO 27001 mapping.
Return ONLY structured JSON in this format:
{
  "risk": "description of the risk",
  "threat": "description of the threat",
  "confidentiality_impact": 1-5,
  "integrity_impact": 1-5,
  "availability_impact": 1-5,
  "likelihood_score": 1-5,
  "risk_category": "Critical/High/Medium/Low",
  "risk_category_2": "Secondary Category (e.g. AppSec, Privacy)",
  "rationale_for_risk_rating": "detailed rationale",
  "current_controls": ["control1", "control2"],
  "selected_controls": ["control3", "control4"],
  "controls_violated_iso27001": ["A.9.1", "A.13.1"],
  "treatment_option": "Mitigate/Avoid/Transfer/Accept",
  "action_plan": "Implementation steps for remediation",
  "responsible_party": "role or team",
  "remarks": "",
  "confidence": 0.0-1.0
}
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": `https://secyourflow.com`, // Optional, for OpenRouter rankings
                "X-Title": `SecYourFlow`, // Optional
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001", // Using a fast and capable model
                "messages": [
                    { "role": "system", "content": "You are a specialized Cybersecurity Risk Analyst. Output only valid JSON." },
                    { "role": "user", "content": prompt }
                ],
                "response_format": { "type": "json_object" }
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("[RiskEngine] OpenRouter API call failed:", error);
        return mockAnalysis(vulnerability, asset);
    }
}

/**
 * Mock analysis for fallback
 */
function mockAnalysis(vulnerability: any, asset: any) {
    const title = vulnerability.title.toLowerCase();
    const isDB = title.includes("database") || title.includes("sql") || title.includes("postgre");

    return {
        "risk": isDB ? "Unauthorized DB access" : "System Compromise",
        "threat": vulnerability.title,
        "confidentiality_impact": isDB ? 5 : 3,
        "integrity_impact": 4,
        "availability_impact": title.includes("dos") ? 5 : 3,
        "likelihood_score": 4,
        "risk_category": vulnerability.severity === 'CRITICAL' ? "Critical" : "High",
        "risk_category_2": "Application Security",
        "rationale_for_risk_rating": "Simulated analysis based on severity and asset type.",
        "current_controls": ["Firewall"],
        "selected_controls": ["MFA", "Encryption"],
        "controls_violated_iso27001": ["A.9.1", "A.13.1"],
        "treatment_option": "Mitigate",
        "action_plan": "Deploy patches and verify config.",
        "responsible_party": "Cloud Security Lead",
        "remarks": "Generated from mock fallback",
        "confidence": 0.8
    };
}

/**
 * Main Pipeline Function
 * Flow: Asset+Context -> AI Analysis -> Calc Scores -> DB Insert -> Compliance Logic
 */
export async function processRiskAssessment(
    vulnerabilityId: string,
    assetId: string,
    organizationId: string,
    userId?: string
) {
    let riskEntryId: string | null = null;
    try {
        // 0. Check if AI Risk Assessment is enabled
        const orgSettings = await prisma.setting.findFirst({
            where: { organizationId: organizationId }
        });

        if (orgSettings && orgSettings.aiRiskAssessmentEnabled === false) {
            console.log(`[RiskEngine] AI Risk Assessment is disabled by organization policy.`);
            return;
        }

        console.log(`[RiskEngine] Starting specific assessment flow for Vuln ${vulnerabilityId}`);

        // 1. Fetch Asset + Context
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
            include: { complianceControls: true }
        });

        const vulnerability = await prisma.vulnerability.findUnique({
            where: { id: vulnerabilityId }
        });

        if (!asset || !vulnerability) {
            console.error("[RiskEngine] Asset or Vulnerability not found");
            return;
        }

        // 1b. Create initial "PROCESSING" record to track state
        const initialEntry = await prisma.riskRegister.create({
            data: {
                assetId,
                vulnerabilityId,
                organizationId,
                riskScore: 0,
                impactScore: 0,
                likelihoodScore: 0,
                status: "PROCESSING",
                aiAnalysis: {},
            }
        });
        riskEntryId = initialEntry.id;

        // 2. AI Risk Engine (OpenRouter)
        const analysis = await analyzeRiskWithAI(vulnerability, asset);

        // 3. Calculate Impact Score = (C + I + A) / 3
        const impactScore = (analysis.confidentiality_impact + analysis.integrity_impact + analysis.availability_impact) / 3;

        // 4. Calculate Final Risk Score = Impact * Likelihood
        const riskScore = impactScore * analysis.likelihood_score; // Range 1-25

        console.log(`[RiskEngine] Scores - C:${analysis.confidentiality_impact} I:${analysis.integrity_impact} A:${analysis.availability_impact} => Impact:${impactScore.toFixed(2)} * Likelihood:${analysis.likelihood_score} = Risk:${riskScore.toFixed(2)}`);

        // 5. UPDATE risk_register entry
        const riskEntry = await prisma.riskRegister.update({
            where: { id: riskEntryId },
            data: {
                riskScore: parseFloat(riskScore.toFixed(2)),
                impactScore: parseFloat(impactScore.toFixed(2)),
                likelihoodScore: parseFloat(analysis.likelihood_score.toString()),
                aiAnalysis: analysis,
                status: "ACTIVE",
                treatmentOption: analysis.treatment_option,
                responsibleParty: analysis.responsible_party,
                currentControls: Array.isArray(analysis.current_controls) ? analysis.current_controls.join(", ") : analysis.current_controls,
                riskCategory2: analysis.risk_category_2,
                actionPlan: analysis.action_plan,
                selectedControls: Array.isArray(analysis.selected_controls) ? analysis.selected_controls.join(", ") : analysis.selected_controls,
                remarks: analysis.remarks,
                confidence: analysis.confidence,
                updatedAt: new Date()
            }
        });

        // 5b. Notify relevant users
        try {
            const securityTeam = await prisma.user.findMany({
                where: {
                    role: { in: ['IT_OFFICER', 'MAIN_OFFICER', 'ANALYST'] },
                    organizationId: organizationId
                },
                select: { id: true }
            });

            if (securityTeam.length > 0) {
                await prisma.notification.createMany({
                    data: securityTeam.map(user => ({
                        userId: user.id,
                        title: "AI Risk Assessment Complete",
                        message: `AI has analyzed risk for '${vulnerability.title}' on '${asset.name}'. Score: ${riskScore.toFixed(1)}/25.`,
                        type: "INFO",
                        link: `/vulnerabilities`
                    }))
                });
            }
        } catch (notifyErr) {
            console.error("[RiskEngine] Failed to notify after assessment:", notifyErr);
        }

        // 6. Compliance Engine Updates (The "Glue")
        // Logic: specific controls_violated_iso27001[] -> Mark ISO Controls as FAILED
        await updateComplianceFromRisk(riskEntry, vulnerability, asset);

        console.log(`[RiskEngine] Pipeline Complete. Compliance % should reflect drop.`);

        // Log the activity
        const logDetails = `Risk calculated: ${riskScore.toFixed(1)}/25. ${analysis.risk}`;
        await logActivity(
            "RISK_ASSESSMENT_COMPLETED",
            "RiskRegister",
            riskEntry.id,
            null,
            { riskScore, impactScore },
            logDetails,
            userId
        );

    } catch (error) {
        console.error("[RiskEngine] Pipeline Failed:", error);
        if (riskEntryId) {
            await prisma.riskRegister.update({
                where: { id: riskEntryId },
                data: { status: "FAILED" }
            }).catch(err => console.error("Failed to update risk entry status to FAILED", err));
        }
    }
}
