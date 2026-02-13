import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { calculateSlaDueAt } from "@/lib/workflow/sla";
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
  resetSlaFromSeverity: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
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

  const data: Record<string, unknown> = {
    ...payload,
    description: payload.description ?? undefined,
    assignedUserId: payload.assignedUserId ?? undefined,
    assignedTeam: payload.assignedTeam ?? undefined,
    solution: payload.solution ?? undefined,
    slaDueAt: payload.slaDueAt ? new Date(payload.slaDueAt) : undefined,
    lastSeen: new Date(),
  };

  if (payload.resetSlaFromSeverity) {
    data.slaDueAt = calculateSlaDueAt(payload.severity || existing.severity);
  }

  const updated = await prisma.vulnerability.update({
    where: { id: existing.id },
    data,
    include: {
      assignedUser: { select: { name: true, email: true } }
    }
  });

  // Handle Notifications
  const promises: Promise<any>[] = [];

  // 1. If assignedUserId changed and is set, notify the new assignee
  if (payload.assignedUserId && payload.assignedUserId !== existing.assignedUserId) {
    promises.push(createNotification({
      userId: payload.assignedUserId,
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

    promises.push(notifyMainOfficers("Vulnerability Fixed", message, link));

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
  const authResult = await requireSessionWithOrg(request);
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
