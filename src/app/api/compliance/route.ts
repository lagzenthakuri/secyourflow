import { NextRequest, NextResponse } from "next/server";
import { mockComplianceOverview } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const frameworkId = searchParams.get("frameworkId");

    let frameworks = [...mockComplianceOverview];

    if (frameworkId) {
        frameworks = frameworks.filter((f) => f.frameworkId === frameworkId);
    }

    return NextResponse.json({
        data: frameworks,
        summary: {
            totalFrameworks: mockComplianceOverview.length,
            averageCompliance:
                mockComplianceOverview.reduce((acc, f) => acc + f.compliancePercentage, 0) /
                mockComplianceOverview.length,
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // In production, this would create a new compliance framework
        const newFramework = {
            id: Date.now().toString(),
            isActive: true,
            createdAt: new Date(),
            ...body,
        };

        return NextResponse.json(newFramework, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create framework" },
            { status: 400 }
        );
    }
}
