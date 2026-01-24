import { NextRequest, NextResponse } from "next/server";
import { mockVulnerabilities, mockExploitedVulnerabilities } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const isExploited = searchParams.get("exploited");
    const cisaKev = searchParams.get("kev");
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let filteredVulns = [...mockVulnerabilities];

    // Apply filters
    if (severity) {
        filteredVulns = filteredVulns.filter((v) => v.severity === severity);
    }
    if (status) {
        filteredVulns = filteredVulns.filter((v) => v.status === status);
    }
    if (isExploited === "true") {
        filteredVulns = filteredVulns.filter((v) => v.isExploited);
    }
    if (cisaKev === "true") {
        filteredVulns = filteredVulns.filter((v) => v.cisaKev);
    }
    if (source) {
        filteredVulns = filteredVulns.filter((v) => v.source === source);
    }
    if (search) {
        const searchLower = search.toLowerCase();
        filteredVulns = filteredVulns.filter(
            (v) =>
                v.title.toLowerCase().includes(searchLower) ||
                v.cveId?.toLowerCase().includes(searchLower)
        );
    }

    // Sort by risk score (descending)
    filteredVulns.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

    // Pagination
    const total = filteredVulns.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVulns = filteredVulns.slice(startIndex, endIndex);

    return NextResponse.json({
        data: paginatedVulns,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // In production, this would create a new vulnerability in the database
        const newVuln = {
            id: Date.now().toString(),
            firstDetected: new Date(),
            lastSeen: new Date(),
            status: "OPEN",
            ...body,
        };

        return NextResponse.json(newVuln, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create vulnerability" },
            { status: 400 }
        );
    }
}
