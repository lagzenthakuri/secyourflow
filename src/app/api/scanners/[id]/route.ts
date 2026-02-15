import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await context.params;

        const existing = await prisma.scannerConfig.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
        }

        await prisma.scannerConfig.delete({
            where: { id: existing.id },
        });

        return NextResponse.json({ message: "Scanner deleted successfully" });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
        }

        console.error("Scanner DELETE Error:", error);
        return NextResponse.json({ error: "Failed to delete scanner" }, { status: 500 });
    }
}
