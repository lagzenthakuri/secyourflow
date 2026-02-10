import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            return NextResponse.json(
                { error: "Scanner not found" },
                { status: 404 }
            );
        }

        console.error("Scanner DELETE Error:", error);
        return NextResponse.json(
            { error: "Failed to delete scanner" },
            { status: 500 }
        );
    }
}
