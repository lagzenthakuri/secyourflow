import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { computeDeadlines, getPhaseStatuses, nextIncidentReference } from "@/lib/nis2/incidents";

const createIncidentSchema = z.object({
    title: z.string().min(3).max(300),
    description: z.string().min(1).max(20000),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).default("HIGH"),
    detectedAt: z.iso.datetime(),
    significantImpact: z.boolean().default(true),
    crossBorder: z.boolean().default(false),
    taxonomy: z.string().max(200).nullable().optional(),
    affectedUsersEstimate: z.number().int().min(0).nullable().optional(),
    assetIds: z.array(z.string().min(1)).max(200).default([]),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const incidents = await prisma.nis2Incident.findMany({
            where: { organizationId: authResult.context.organizationId },
            include: {
                reportedBy: { select: { id: true, name: true, email: true } },
                affectedAssets: { include: { asset: { select: { id: true, name: true, type: true } } } },
                _count: { select: { timeline: true } },
            },
            orderBy: { detectedAt: "desc" },
        });

        const now = new Date();

        return NextResponse.json({
            data: incidents.map((incident) => ({
                ...incident,
                phases: getPhaseStatuses(incident, now),
            })),
        });
    } catch (error) {
        console.error("Error fetching NIS2 incidents:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST", "PENTESTER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = createIncidentSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid incident payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { assetIds, detectedAt, ...input } = parsed.data;
        const detected = new Date(detectedAt);

        if (detected.getTime() > Date.now()) {
            return NextResponse.json({ error: "detectedAt cannot be in the future" }, { status: 400 });
        }

        // Reject asset ids from other tenants before they reach the join table.
        if (assetIds.length > 0) {
            const owned = await prisma.asset.count({
                where: { id: { in: assetIds }, organizationId },
            });
            if (owned !== new Set(assetIds).size) {
                return NextResponse.json(
                    { error: "One or more assets do not belong to this organization" },
                    { status: 400 },
                );
            }
        }

        const deadlines = computeDeadlines(detected);
        const reference = await nextIncidentReference(organizationId, detected);

        const incident = await prisma.nis2Incident.create({
            data: {
                ...input,
                organizationId,
                reference,
                detectedAt: detected,
                ...deadlines,
                reportedById: userId,
                affectedAssets: {
                    create: [...new Set(assetIds)].map((assetId) => ({ assetId, organizationId })),
                },
                timeline: {
                    create: {
                        occurredAt: detected,
                        description: "Incident detected and registered.",
                        authorId: userId,
                    },
                },
            },
            include: {
                affectedAssets: { include: { asset: { select: { id: true, name: true, type: true } } } },
                timeline: true,
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_INCIDENT_CREATED",
                entityType: "Nis2Incident",
                entityId: incident.id,
                newValue: { reference: incident.reference, severity: incident.severity },
                userId,
                organizationId,
            },
        });

        return NextResponse.json(
            { data: { ...incident, phases: getPhaseStatuses(incident) } },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating NIS2 incident:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
