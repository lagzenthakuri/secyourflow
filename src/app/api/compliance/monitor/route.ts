
import { NextResponse } from "next/server";
import { runContinuousComplianceAudit } from "@/lib/evidence-engine";

export async function POST() {
    try {
        await runContinuousComplianceAudit();
        return NextResponse.json({ message: "Continuous compliance audit completed and evidence pulled." });
    } catch (error) {
        console.error("Compliance Monitor Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to run monitoring" },
            { status: 500 }
        );
    }
}
