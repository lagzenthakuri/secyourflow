import { NextRequest, NextResponse } from "next/server";
import { calculateRiskScore } from "@/lib/utils";

interface RiskCalculationRequest {
    cvssScore: number;
    epssScore: number;
    assetCriticality: string;
    isExploited: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: RiskCalculationRequest = await request.json();

        const { cvssScore, epssScore, assetCriticality, isExploited } = body;

        // Validate inputs
        if (cvssScore === undefined || epssScore === undefined) {
            return NextResponse.json(
                { error: "cvssScore and epssScore are required" },
                { status: 400 }
            );
        }

        const riskScore = calculateRiskScore(
            cvssScore,
            epssScore,
            assetCriticality || "MEDIUM",
            isExploited || false
        );

        const riskLevel =
            riskScore >= 80
                ? "CRITICAL"
                : riskScore >= 60
                    ? "HIGH"
                    : riskScore >= 40
                        ? "MEDIUM"
                        : "LOW";

        return NextResponse.json({
            riskScore,
            riskLevel,
            factors: {
                baseCvss: cvssScore,
                epssMultiplier: 1 + epssScore,
                criticalityMultiplier: getCriticalityMultiplier(assetCriticality),
                exploitedMultiplier: isExploited ? 1.5 : 1.0,
            },
            recommendations: getRecommendations(riskScore, isExploited),
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to calculate risk score" },
            { status: 400 }
        );
    }
}

function getCriticalityMultiplier(criticality: string): number {
    const multipliers: Record<string, number> = {
        CRITICAL: 1.5,
        HIGH: 1.25,
        MEDIUM: 1.0,
        LOW: 0.75,
        INFORMATIONAL: 0.5,
    };
    return multipliers[criticality] || 1.0;
}

function getRecommendations(riskScore: number, isExploited: boolean): string[] {
    const recommendations: string[] = [];

    if (isExploited) {
        recommendations.push("URGENT: This vulnerability is being actively exploited. Prioritize immediate remediation.");
    }

    if (riskScore >= 80) {
        recommendations.push("Apply vendor patches immediately");
        recommendations.push("Consider temporary mitigations (network segmentation, WAF rules)");
        recommendations.push("Notify incident response team");
    } else if (riskScore >= 60) {
        recommendations.push("Schedule patching within 7 days");
        recommendations.push("Review asset exposure and access controls");
    } else if (riskScore >= 40) {
        recommendations.push("Include in next patch cycle");
        recommendations.push("Monitor for changes in exploitation status");
    } else {
        recommendations.push("Schedule for routine maintenance");
    }

    return recommendations;
}

export async function GET() {
    // Return risk scoring methodology
    return NextResponse.json({
        methodology: "SecYourFlow Risk Scoring Engine",
        version: "1.0",
        formula: "RiskScore = CVSS × (1 + EPSS) × CriticalityMultiplier × ExploitMultiplier",
        factors: {
            cvss: {
                description: "Common Vulnerability Scoring System (0-10)",
                weight: "Base score normalized to 0-100",
            },
            epss: {
                description: "Exploit Prediction Scoring System (0-1)",
                weight: "Multiplier: 1 + EPSS score",
            },
            criticality: {
                description: "Asset business criticality",
                multipliers: {
                    CRITICAL: 1.5,
                    HIGH: 1.25,
                    MEDIUM: 1.0,
                    LOW: 0.75,
                    INFORMATIONAL: 0.5,
                },
            },
            exploited: {
                description: "Active exploitation status",
                multiplier: "1.5 if actively exploited, 1.0 otherwise",
            },
        },
        riskLevels: {
            CRITICAL: "80-100",
            HIGH: "60-79",
            MEDIUM: "40-59",
            LOW: "0-39",
        },
    });
}
