import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { getMeasureDefinition } from "@/lib/nis2/article21-catalog";
import { seedChecklist, summarizeChecklist } from "@/lib/nis2/governance";

const updateChecklistItemSchema = z.object({
    id: z.string().min(1),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"]).optional(),
    ownerId: z.string().min(1).nullable().optional(),
    dueDate: z.iso.datetime().nullable().optional(),
    documentUrl: z.url().max(2000).nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId } = authResult.context;

    try {
        // First visit for an organization materialises the baseline checklist.
        const existingCount = await prisma.nis2ChecklistItem.count({ where: { organizationId } });
        if (existingCount === 0) {
            await seedChecklist(organizationId);
        }

        const items = await prisma.nis2ChecklistItem.findMany({
            where: { organizationId },
            include: { owner: { select: { id: true, name: true, email: true } } },
            orderBy: { code: "asc" },
        });

        return NextResponse.json({
            data: items.map((item) => {
                const definition = getMeasureDefinition(item.measure);
                return {
                    ...item,
                    article: `Art. 21(2)(${definition.letter})`,
                    measureLabel: definition.label,
                };
            }),
            summary: summarizeChecklist(items),
        });
    } catch (error) {
        console.error("Error fetching NIS2 governance checklist:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = updateChecklistItemSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid checklist update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { id, dueDate, ownerId, ...updates } = parsed.data;

        const existing = await prisma.nis2ChecklistItem.findFirst({
            where: { id, organizationId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
        }

        // An owner must belong to the same organization.
        if (ownerId) {
            const owner = await prisma.user.findFirst({
                where: { id: ownerId, organizationId },
                select: { id: true },
            });
            if (!owner) {
                return NextResponse.json({ error: "Owner is not a member of this organization" }, { status: 400 });
            }
        }

        const updated = await prisma.nis2ChecklistItem.update({
            where: { id: existing.id },
            data: {
                ...updates,
                ...(ownerId !== undefined && { ownerId }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(updates.status && { lastReviewedAt: new Date() }),
            },
            include: { owner: { select: { id: true, name: true, email: true } } },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_CHECKLIST_ITEM_UPDATED",
                entityType: "Nis2ChecklistItem",
                entityId: updated.id,
                oldValue: { status: existing.status, ownerId: existing.ownerId, dueDate: existing.dueDate },
                newValue: { status: updated.status, ownerId: updated.ownerId, dueDate: updated.dueDate },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Error updating NIS2 checklist item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
