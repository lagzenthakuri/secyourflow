import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        await prisma.scannerConfig.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Scanner deleted successfully" });
    } catch (error) {
        console.error("Scanner DELETE Error:", error);
        return NextResponse.json(
            { error: "Failed to delete scanner" },
            { status: 500 }
        );
    }
}
