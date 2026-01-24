import { NextRequest, NextResponse } from "next/server";
import { mockAssets } from "@/lib/mock-data";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const criticality = searchParams.get("criticality");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let filteredAssets = [...mockAssets];

    // Apply filters
    if (type) {
        filteredAssets = filteredAssets.filter((a) => a.type === type);
    }
    if (status) {
        filteredAssets = filteredAssets.filter((a) => a.status === status);
    }
    if (criticality) {
        filteredAssets = filteredAssets.filter((a) => a.criticality === criticality);
    }
    if (search) {
        const searchLower = search.toLowerCase();
        filteredAssets = filteredAssets.filter(
            (a) =>
                a.name.toLowerCase().includes(searchLower) ||
                a.ipAddress?.toLowerCase().includes(searchLower) ||
                a.hostname?.toLowerCase().includes(searchLower)
        );
    }

    // Pagination
    const total = filteredAssets.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

    return NextResponse.json({
        data: paginatedAssets,
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

        // In production, this would create a new asset in the database
        const newAsset = {
            id: Date.now().toString(),
            createdAt: new Date(),
            ...body,
        };

        return NextResponse.json(newAsset, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Failed to create asset" },
            { status: 400 }
        );
    }
}
