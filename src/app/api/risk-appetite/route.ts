import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { appetiteLevelLabel, riskLevelForScore } from "@/lib/grc/appetite";
import { evaluateRiskRows, fetchAppetiteStatements, summarizeAppetite } from "@/lib/grc/overviews";

/**
 * Board-level risk appetite statements, each evaluated against the risks it
 * governs so the page shows live counts rather than static declarations.
 */

const APPETITE_LEVELS = ["AVERSE", "CAUTIOUS", "MODERATE", "OPEN", "HUNGRY"] as const;

const createStatementSchema = z.object({
    category: z.string().min(1).max(100),
    statement: z.string().min(2).max(2000),
    appetiteLevel: z.enum(APPETITE_LEVELS).default("MODERATE"),
    toleranceMax: z.coerce.number().int().min(1).max(25),
    boardApproved: z.boolean().default(false),
    reviewDate: z.iso.datetime().nullable().optional(),
    owner: z.string().max(200).nullable().optional(),
});

const RISK_SELECT = {
    id: true,
    riskScore: true,
    isResolved: true,
    status: true,
    aiAnalysis: true,
    riskCategory2: true,
    vendorId: true,
    assetId: true,
    vulnerability: { select: { title: true } },
    asset: { select: { name: true } },
} as const;

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const organizationId = authResult.context.organizationId;
        const [statements, risks] = await Promise.all([
            fetchAppetiteStatements(organizationId),
            prisma.riskRegister.findMany({
                where: { organizationId, isResolved: false },
                select: RISK_SELECT,
            }),
        ]);

        const evaluated = evaluateRiskRows(risks, statements);

        const data = statements.map((statement) => {
            // `evaluated` already resolved the best match per risk, so grouping
            // by matched category keeps a specific statement's risks out of the
            // ALL catch-all's counts.
            const governed = evaluated.filter(
                (risk) => risk.appetiteCategory === statement.category,
            );
            const summary = summarizeAppetite(governed);

            return {
                ...statement,
                appetiteLabel: appetiteLevelLabel(statement.appetiteLevel),
                risks: {
                    evaluated: summary.evaluated,
                    within: summary.within,
                    approaching: summary.approaching,
                    exceeded: summary.exceeded,
                    maxScore: governed.reduce((max, risk) => Math.max(max, risk.riskScore), 0),
                    riskLevel: riskLevelForScore(
                        governed.reduce((max, risk) => Math.max(max, risk.riskScore), 0),
                    ),
                },
            };
        });

        return NextResponse.json({
            data,
            summary: summarizeAppetite(evaluated),
        });
    } catch (error) {
        console.error("Error fetching risk appetite statements:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = createStatementSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid risk appetite payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const now = new Date();
        const { reviewDate, ...fields } = parsed.data;

        const statement = await prisma.riskAppetite.create({
            data: {
                ...fields,
                reviewDate: reviewDate ? new Date(reviewDate) : null,
                boardApprovedAt: fields.boardApproved ? now : null,
                organizationId,
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "RISK_APPETITE_CREATED",
                entityType: "RiskAppetite",
                entityId: statement.id,
                newValue: {
                    category: statement.category,
                    appetiteLevel: statement.appetiteLevel,
                    toleranceMax: statement.toleranceMax,
                    boardApproved: statement.boardApproved,
                },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: statement }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "An appetite statement for that category already exists" },
                { status: 409 },
            );
        }
        console.error("Error creating risk appetite statement:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
