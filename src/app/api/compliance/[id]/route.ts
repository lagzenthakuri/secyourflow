import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updatedFramework = await prisma.complianceFramework.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(updatedFramework);
    } catch (error) {
        console.error("Update Framework Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Cascade delete should handle controls if configured, 
        // but we'll manually ensure relations are handled if needed.
        // In schema: controls has onDelete: Cascade
        
        await prisma.complianceFramework.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Framework deleted successfully" });
    } catch (error) {
        console.error("Delete Framework Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
