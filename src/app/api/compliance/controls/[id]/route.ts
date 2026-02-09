import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // If status changed to COMPLIANT, we might want to update lastAssessed
        const data: Record<string, unknown> = { ...body };
        if (body.status && body.status !== "NOT_ASSESSED") {
            data.lastAssessed = new Date();
        }

        const updatedControl = await prisma.complianceControl.update({
            where: { id },
            data,
        });

        return NextResponse.json(updatedControl);
    } catch (error) {
        console.error("Update Control Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.complianceControl.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Control deleted successfully" });
    } catch (error) {
        console.error("Delete Control Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
