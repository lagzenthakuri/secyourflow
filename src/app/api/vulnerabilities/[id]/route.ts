import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSessionWithOrg,
  ROLE_VULNERABILITY_DELETE,
  ROLE_VULNERABILITY_WRITE,
} from "@/lib/api-auth";
import { calculateSlaDueAt } from "@/lib/workflow/sla";
import { applyWorkflowStateTimestamps } from "@/lib/workflow/state-machine";
import type { Prisma, VulnStatus, WorkflowState } from "@prisma/client";
import { createNotification, notifyMainOfficers } from "@/lib/notifications/service";

const updateSchema = z.object({
  title: z.string().min(3).max(300).optional(),
  description: z.string().optional().nullable(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "MITIGATED", "FIXED", "ACCEPTED", "FALSE_POSITIVE"]).optional(),
  workflowState: z.enum(["NEW", "TRIAGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  assignedUserId: z.string().optional().nullable(),
  assignedTeam: z.string().optional().nullable(),
  slaDueAt: z.string().datetime().optional().nullable(),
  solution: z.string().optional().nullable(),
  // These three were missing, and Zod strips unknown keys — so the edit modal
  // submitted them, got a 200 back, and nothing was written.
  cvssScore: z.number().min(0).max(10).optional().nullable(),
  cvssVector: z.string().max(255).optional().nullable(),
  /** Asset to link this finding to. Risk analysis needs one. */
  assetId: z.string().optional().nullable(),
  resetSlaFromSeverity: z.boolean().optional(),
});

/**
 * Keeps `status` in step with `workflowState`, leaving an existing status alone
 * when it is already consistent with the new workflow state.
 */
function statusForWorkflowState(next: WorkflowState, current: VulnStatus): VulnStatus {
  switch (next) {
    case "NEW":
      return current === "OPEN" ? current : "OPEN";
    case "TRIAGED":
      return current === "OPEN" || current === "IN_PROGRESS" ? current : "OPEN";
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "RESOLVED":
      return current === "FIXED" || current === "MITIGATED" ? current : "FIXED";
    case "CLOSED":
      return current === "ACCEPTED" || current === "FALSE_POSITIVE" ? current : "ACCEPTED";
    default:
      return current;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request, {
    allowedRoles: ROLE_VULNERABILITY_WRITE,
  });
  if (!authResult.ok) return authResult.response;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const payload = parsed.data;

  const existing = await prisma.vulnerability.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
  }

  const assignedUserId =
    payload.assignedUserId === null
      ? null
      : typeof payload.assignedUserId === "string" && payload.assignedUserId.trim().length > 0
        ? payload.assignedUserId.trim()
        : undefined;

  if (typeof assignedUserId === "string") {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedUserId,
        organizationId: authResult.context.organizationId,
      },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json({ error: "assignedUserId is invalid for your organization" }, { status: 400 });
    }
  }

  const assetId =
    payload.assetId === undefined
      ? undefined
      : payload.assetId === null || payload.assetId.trim().length === 0
        ? null
        : payload.assetId.trim();

  if (typeof assetId === "string") {
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, organizationId: authResult.context.organizationId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: "assetId is invalid for your organization" }, { status: 400 });
    }
  }

  // Built explicitly rather than by spreading `payload`: `resetSlaFromSeverity`
  // is a request flag, not a column, and spreading it made Prisma throw
  // `Unknown argument` in a handler with no error handling.
  const data: Prisma.VulnerabilityUpdateInput = { lastSeen: new Date() };

  if (payload.title !== undefined) data.title = payload.title;
  if (payload.severity !== undefined) data.severity = payload.severity;
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.workflowState !== undefined) data.workflowState = payload.workflowState;

  // `?? undefined` collapses an explicit null into "no change", so clearing a
  // field was impossible. These fields are nullable; honour null.
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.assignedTeam !== undefined) data.assignedTeam = payload.assignedTeam;
  if (payload.solution !== undefined) data.solution = payload.solution;
  if (payload.cvssScore !== undefined) data.cvssScore = payload.cvssScore;
  if (payload.cvssVector !== undefined) data.cvssVector = payload.cvssVector;
  if (payload.slaDueAt !== undefined) {
    data.slaDueAt = payload.slaDueAt ? new Date(payload.slaDueAt) : null;
  }

  if (assignedUserId === null) {
    data.assignedUser = { disconnect: true };
  } else if (typeof assignedUserId === "string") {
    data.assignedUser = { connect: { id: assignedUserId } };
  }

  if (payload.resetSlaFromSeverity) {
    data.slaDueAt = calculateSlaDueAt(payload.severity || existing.severity);
  }

  // Keep the two status fields consistent. The workflow endpoint updates only
  // `workflowState`, which is how a row ended up rendering "Open" and
  // "Resolved" side by side.
  if (payload.workflowState !== undefined && payload.status === undefined) {
    data.status = statusForWorkflowState(payload.workflowState, existing.status);
  }

  Object.assign(data, applyWorkflowStateTimestamps(
    (payload.workflowState ?? existing.workflowState),
    new Date(),
  ));

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const result = await tx.vulnerability.update({
        where: { id: existing.id },
        data,
        include: { assignedUser: { select: { name: true, email: true } } },
      });

      // Asset linkage lives on the join table, not on Vulnerability. Without
      // this a finding created without an asset could never be given one, and
      // risk analysis requires an asset.
      if (assetId !== undefined) {
        await tx.assetVulnerability.deleteMany({ where: { vulnerabilityId: existing.id } });
        if (assetId) {
          await tx.assetVulnerability.create({
            data: { assetId, vulnerabilityId: existing.id, status: result.status },
          });
        }
      }

      if (payload.workflowState !== undefined && payload.workflowState !== existing.workflowState) {
        await tx.vulnerabilityWorkflowTransition.create({
          data: {
            vulnerabilityId: existing.id,
            organizationId: authResult.context.organizationId,
            fromState: existing.workflowState,
            toState: payload.workflowState,
            changedById: authResult.context.userId,
          },
        });
      }

      return result;
    });
  } catch (error) {
    console.error("Update Vulnerability Error:", error);
    return NextResponse.json({ error: "Failed to update vulnerability" }, { status: 500 });
  }

  // Handle Notifications
  const promises: Array<Promise<unknown>> = [];

  // 1. If assignedUserId changed and is set, notify the new assignee
  if (typeof assignedUserId === "string" && assignedUserId !== existing.assignedUserId) {
    promises.push(createNotification({
      userId: assignedUserId,
      title: "Vulnerability Assigned",
      message: `You have been assigned to vulnerability: ${updated.title}`,
      type: "INFO",
      link: `/vulnerabilities?search=${updated.id}`
    }));
  }

  // 2. If status changed to FIXED
  if (payload.status === "FIXED" && existing.status !== "FIXED") {
    const message = `Vulnerability fixed: ${updated.title} (ID: ${updated.id})`;
    const link = `/vulnerabilities?search=${updated.id}`;

    // Notify the assigner (creator of the vulnerability)
    // In this schema, we don't track creator directly on Vulnerability, but we can notify the current main officers
    // Or if there was a previous assignee who isn't the one who fixed it? 
    // Usually "assigner" means the person who gave the task.

    promises.push(notifyMainOfficers(authResult.context.organizationId, "Vulnerability Fixed", message, link));

    // If the vulnerability was assigned to someone else, notify them too
    if (updated.assignedUserId && updated.assignedUserId !== authResult.context.userId) {
      promises.push(createNotification({
        userId: updated.assignedUserId,
        title: "Vulnerability Fixed",
        message,
        type: "SUCCESS",
        link
      }));
    }
  }

  await Promise.allSettled(promises);

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request, {
    allowedRoles: ROLE_VULNERABILITY_DELETE,
  });
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const existing = await prisma.vulnerability.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
  }

  await prisma.vulnerability.delete({ where: { id } });
  return NextResponse.json({ message: "Vulnerability deleted successfully" });
}
