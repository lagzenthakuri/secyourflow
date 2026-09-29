import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { computeDeadlines, derivePhase, getPhaseStatuses } from "@/lib/nis2/incidents";

const updateIncidentSchema = z.object({
    title: z.string().min(3).max(300).optional(),
    description: z.string().min(1).max(20000).optional(),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
    status: z.enum(["OPEN", "CONTAINED", "RESOLVED", "CLOSED"]).optional(),
    detectedAt: z.iso.datetime().optional(),
    significantImpact: z.boolean().optional(),
    crossBorder: z.boolean().optional(),
    taxonomy: z.string().max(200).nullable().optional(),
    affectedUsersEstimate: z.number().int().min(0).nullable().optional(),
    iocs: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
    timelineEntry: z
        .object({
            occurredAt: z.iso.datetime(),
            description: z.string().min(1).max(4000),
        })
        .optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;

        const incident = await prisma.nis2Incident.findFirst({
            where: { id, organizationId: authResult.context.organizationId },
            include: {
                reportedBy: { select: { id: true, name: true, email: true } },
                affectedAssets: { include: { asset: { select: { id: true, name: true, type: true } } } },
                timeline: {
                    include: { author: { select: { id: true, name: true, email: true } } },
                    orderBy: { occurredAt: "asc" },
                },
                alerts: { orderBy: { dispatchedAt: "desc" } },
            },
        });

        if (!incident) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 });
        }

        return NextResponse.json({ data: { ...incident, phases: getPhaseStatuses(incident) } });
    } catch (error) {
        console.error("Error fetching NIS2 incident:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = updateIncidentSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid incident update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.nis2Incident.findFirst({ where: { id, organizationId } });
        if (!existing) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 });
        }

        const { detectedAt, timelineEntry, iocs, ...updates } = parsed.data;

        // Moving the awareness timestamp moves every Art. 23 deadline with it.
        const rescheduled = detectedAt ? computeDeadlines(new Date(detectedAt)) : {};

        const updated = await prisma.nis2Incident.update({
            where: { id: existing.id },
            data: {
                ...updates,
                ...(detectedAt && { detectedAt: new Date(detectedAt) }),
                ...rescheduled,
                ...(iocs !== undefined && { iocs: iocs as unknown as Prisma.InputJsonValue }),
                ...(timelineEntry && {
                    timeline: {
                        create: {
                            occurredAt: new Date(timelineEntry.occurredAt),
                            description: timelineEntry.description,
                            authorId: userId,
                        },
                    },
                }),
            },
            include: {
                affectedAssets: { include: { asset: { select: { id: true, name: true, type: true } } } },
                timeline: { orderBy: { occurredAt: "asc" } },
            },
        });

        // Keep the phase consistent with what has actually been submitted.
        const phase = derivePhase(updated);
        const synced =
            phase === updated.phase
                ? updated
                : await prisma.nis2Incident.update({
                      where: { id: updated.id },
                      data: { phase },
                      include: {
                          affectedAssets: {
                              include: { asset: { select: { id: true, name: true, type: true } } },
                          },
                          timeline: { orderBy: { occurredAt: "asc" } },
                      },
                  });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_INCIDENT_UPDATED",
                entityType: "Nis2Incident",
                entityId: synced.id,
                oldValue: { status: existing.status, severity: existing.severity, detectedAt: existing.detectedAt },
                newValue: { status: synced.status, severity: synced.severity, detectedAt: synced.detectedAt },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { ...synced, phases: getPhaseStatuses(synced) } });
    } catch (error) {
        console.error("Error updating NIS2 incident:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
