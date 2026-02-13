import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { applyWorkflowStateTimestamps, assertValidWorkflowTransition } from "@/lib/workflow/state-machine";
import { calculateSlaDueAt } from "@/lib/workflow/sla";

const workflowSchema = z.object({
  toState: z.enum(["NEW", "TRIAGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  note: z.string().max(2000).optional(),
  assignedUserId: z.string().optional().nullable(),
  assignedTeam: z.string().max(120).optional().nullable(),
  slaDueAt: z.string().datetime().optional().nullable(),
  resetSlaFromSeverity: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = workflowSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid workflow payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const { id } = await params;
  const { organizationId, userId } = authResult.context;

  const vulnerability = await prisma.vulnerability.findFirst({
    where: { id, organizationId },
  });

  if (!vulnerability) {
    return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
  }

  const now = new Date();
  const toState = payload.toState || vulnerability.workflowState;

  if (toState !== vulnerability.workflowState) {
    try {
      assertValidWorkflowTransition(vulnerability.workflowState, toState);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid transition" },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = {
    workflowState: toState,
  };

  if (typeof payload.assignedUserId !== "undefined") {
    updates.assignedUserId = payload.assignedUserId;
  }

  if (typeof payload.assignedTeam !== "undefined") {
    updates.assignedTeam = payload.assignedTeam;
  }

  if (payload.slaDueAt) {
    updates.slaDueAt = new Date(payload.slaDueAt);
  }

  if (payload.resetSlaFromSeverity) {
    updates.slaDueAt = calculateSlaDueAt(vulnerability.severity, now);
  }

  Object.assign(updates, applyWorkflowStateTimestamps(toState, now));

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.vulnerability.update({
      where: { id: vulnerability.id },
      data: updates,
    });

    await tx.vulnerabilityWorkflowTransition.create({
      data: {
        vulnerabilityId: vulnerability.id,
        organizationId,
        fromState: vulnerability.workflowState,
        toState,
        changedById: userId,
        note: payload.note,
      },
    });

    return updated;
  });

  return NextResponse.json(result);
}
