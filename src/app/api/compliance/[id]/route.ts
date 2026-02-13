import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

const updateFrameworkSchema = z.object({
    name: z.string().trim().min(1).max(160).optional(),
    version: z.string().trim().max(80).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = updateFrameworkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid framework update payload" }, { status: 400 });
        }

        const existingFramework = await prisma.complianceFramework.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existingFramework) {
            return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        const updatedFramework = await prisma.complianceFramework.update({
            where: { id },
            data: parsed.data,
        });

        return NextResponse.json(updatedFramework);
    } catch (error) {
        console.error("Update Framework Error:", error);
        return NextResponse.json({ error: "Failed to update framework" }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const existingFramework = await prisma.complianceFramework.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existingFramework) {
            return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        await prisma.complianceFramework.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Framework deleted successfully" });
    } catch (error) {
        console.error("Delete Framework Error:", error);
        return NextResponse.json({ error: "Failed to delete framework" }, { status: 400 });
    }
}
