
import { prisma } from "@/lib/prisma";

/**
 * Generates an AI-powered human-friendly summary for reports.
 * Fulfills Step 5: CEO view, CISO view, Auditor view.
 */
export async function generateAIReportSummary(reportId: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return "Manual report summary available in detailed view.";
    }

    const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { organization: true }
    });

    if (!report) return null;

    // Fetch context for the AI
    const [risks, vulnerabilities, compliance] = await Promise.all([
        prisma.riskRegister.findMany({
            where: { organizationId: report.organizationId, status: "ACTIVE" },
            orderBy: { riskScore: 'desc' },
            take: 5,
            include: { vulnerability: true, asset: true }
        }),
        prisma.vulnerability.findMany({
            where: { organizationId: report.organizationId },
            orderBy: { severity: 'desc' },
            take: 10
        }),
        prisma.complianceFramework.findMany({
            where: { organizationId: report.organizationId },
            include: {
                controls: {
                    select: { status: true }
                }
            }
        })
    ]);

    const prompt = `
Generate a human-friendly executive summary for a Cybersecurity Report.
Report Type: ${report.type}
Organization: ${report.organization.name}

Data Summary:
- Top Risks: ${risks.map(r => `${r.vulnerability.title} on ${r.asset.name} (Risk: ${r.riskScore}/25)`).join(', ')}
- Vulnerability Overview: ${vulnerabilities.length} active vulnerabilities found.
- Compliance Status: ${compliance.map(f => {
        const total = f.controls.length;
        const nonCompliant = f.controls.filter(c => c.status === 'NON_COMPLIANT').length;
        return `${f.name}: ${nonCompliant}/${total} controls non-compliant`;
    }).join(', ')}

Please provide:
1. CEO View: High-level business impact and strategic priority.
2. CISO View: Technical breakdown of top threats and remediation trends.
3. Auditor View: Summary of framework alignment (ISO 27001) and evidence gaps.

Return the response in professional markdown format.
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
                "messages": [
                    { "role": "system", "content": "You are a professional Cybersecurity Advisor." },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content) {
            // Update report with the summary
            await prisma.report.update({
                where: { id: reportId },
                data: {
                    description: content.substring(0, 1000) // Sticking to description for now or metadata
                }
            });
            return content;
        }
    } catch (error) {
        console.error("[ReportEngine] AI Summary Generation Failed:", error);
    }

    return "Summary generation unavailable.";
}
