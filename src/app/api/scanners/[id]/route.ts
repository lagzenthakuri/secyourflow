import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER, Role.IT_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await context.params;

        const existingScanner = await prisma.scannerConfig.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });
        if (!existingScanner) {
            return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
        }

        await prisma.scannerConfig.delete({
            where: { id: existingScanner.id },
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
