import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { frameworkId, ...controlData } = body;

        if (!frameworkId) {
            return NextResponse.json({ error: "Framework ID is required" }, { status: 400 });
        }

        const newControl = await prisma.complianceControl.create({
            data: {
                ...controlData,
                frameworkId: frameworkId,
            },
        });

        return NextResponse.json(newControl, { status: 201 });
    } catch (error: any) {
        console.error("Create Control Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
