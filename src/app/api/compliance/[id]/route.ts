import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const updateFrameworkSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().optional().nullable(),
    version: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const parsed = updateFrameworkSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid framework update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.complianceFramework.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        const updatedFramework = await prisma.complianceFramework.update({
            where: { id: existing.id },
            data: {
                ...parsed.data,
                description: parsed.data.description === undefined ? undefined : parsed.data.description || null,
                version: parsed.data.version === undefined ? undefined : parsed.data.version || null,
            },
        });

        return NextResponse.json(updatedFramework);
    } catch (error) {
        console.error("Update Framework Error:", error);
        return NextResponse.json({ error: "Failed to update framework" }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;

        const existing = await prisma.complianceFramework.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        await prisma.complianceFramework.delete({
            where: { id: existing.id },
        });

        return NextResponse.json({ message: "Framework deleted successfully" });
    } catch (error) {
        console.error("Delete Framework Error:", error);
        return NextResponse.json({ error: "Failed to delete framework" }, { status: 400 });
    }
}
