import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { appetiteLevelLabel } from "@/lib/grc/appetite";
import { evaluateRiskRows } from "@/lib/grc/overviews";

const APPETITE_LEVELS = ["AVERSE", "CAUTIOUS", "MODERATE", "OPEN", "HUNGRY"] as const;

const updateStatementSchema = z
    .object({
        category: z.string().min(1).max(100).optional(),
        statement: z.string().min(2).max(2000).optional(),
        appetiteLevel: z.enum(APPETITE_LEVELS).optional(),
        toleranceMax: z.coerce.number().int().min(1).max(25).optional(),
        boardApproved: z.boolean().optional(),
        reviewDate: z.iso.datetime().nullable().optional(),
        owner: z.string().max(200).nullable().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        message: "Nothing to update",
    });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const organizationId = authResult.context.organizationId;

        const statement = await prisma.riskAppetite.findFirst({
            where: { id, organizationId },
        });
        if (!statement) {
            return NextResponse.json({ error: "Appetite statement not found" }, { status: 404 });
        }

        const risks = await prisma.riskRegister.findMany({
            where: { organizationId, isResolved: false },
            select: {
                id: true,
                riskScore: true,
                isResolved: true,
                aiAnalysis: true,
                riskCategory2: true,
                vendorId: true,
                assetId: true,
                vulnerability: { select: { title: true } },
                asset: { select: { name: true } },
            },
        });

        // A single statement is passed, so every returned risk was actually
        // governed by it (exact category match, or this statement is the
        // catch-all).
        const governed = evaluateRiskRows(risks, [statement]).filter(
            (risk) => risk.appetiteCategory !== null,
        );

        return NextResponse.json({
            data: {
                ...statement,
                appetiteLabel: appetiteLevelLabel(statement.appetiteLevel),
                risks: governed.map((risk) => ({
                    id: risk.id,
                    threat: risk.vulnerability.title,
                    assetName: risk.asset.name,
                    riskScore: risk.riskScore,
                    riskLevel: risk.riskLevel,
                    appetiteStatus: risk.appetiteStatus,
                    isResolved: risk.isResolved,
                })),
            },
        });
    } catch (error) {
        console.error("Error fetching appetite statement:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = updateStatementSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid risk appetite payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.riskAppetite.findFirst({ where: { id, organizationId } });
        if (!existing) {
            return NextResponse.json({ error: "Appetite statement not found" }, { status: 404 });
        }

        const { reviewDate, ...updates } = parsed.data;
        const now = new Date();
        // Approval is a moment in time; un-approving clears it again.
        const boardApproved =
            updates.boardApproved === undefined ? undefined : updates.boardApproved;
        const boardApprovedAt =
            boardApproved === undefined
                ? undefined
                : boardApproved
                  ? (existing.boardApprovedAt ?? now)
                  : null;

        const statement = await prisma.riskAppetite.update({
            where: { id: existing.id },
            data: {
                ...updates,
                boardApprovedAt,
                ...(reviewDate !== undefined && {
                    reviewDate: reviewDate ? new Date(reviewDate) : null,
                }),
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "RISK_APPETITE_UPDATED",
                entityType: "RiskAppetite",
                entityId: statement.id,
                oldValue: {
                    category: existing.category,
                    toleranceMax: existing.toleranceMax,
                    boardApproved: existing.boardApproved,
                },
                newValue: {
                    category: statement.category,
                    toleranceMax: statement.toleranceMax,
                    boardApproved: statement.boardApproved,
                },
                userId,
                organizationId,
            },
        });

        // Statements are evaluated at read time, so every risk, vendor and
        // asset view picks up the new tolerance without a recalculation pass.
        return NextResponse.json({ data: statement });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "An appetite statement for that category already exists" },
                { status: 409 },
            );
        }
        console.error("Error updating appetite statement:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const existing = await prisma.riskAppetite.findFirst({
            where: { id, organizationId },
            select: { id: true, category: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Appetite statement not found" }, { status: 404 });
        }

        await prisma.riskAppetite.delete({ where: { id: existing.id } });

        await prisma.auditLog.create({
            data: {
                action: "RISK_APPETITE_DELETED",
                entityType: "RiskAppetite",
                entityId: existing.id,
                oldValue: { category: existing.category },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { id: existing.id } });
    } catch (error) {
        console.error("Error deleting appetite statement:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
