
import { NextRequest, NextResponse } from "next/server";
import { runAIScan } from "@/lib/scanner-engine";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { assetId, apiKey, model } = body;

        if (!assetId) {
            return NextResponse.json(
                { error: "assetId is required" },
                { status: 400 }
            );
        }

        const result = await runAIScan(assetId, apiKey, model);

        return NextResponse.json({
            message: "Scan completed successfully",
            ...result
        });
    } catch (error: any) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to run scan" },
            { status: 500 }
        );
    }
}
