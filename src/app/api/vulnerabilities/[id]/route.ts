import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { calculateSlaDueAt } from "@/lib/workflow/sla";

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
  const authResult = await requireSessionWithOrg();
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
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
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
