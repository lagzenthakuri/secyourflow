import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
  deleteRemediationPlan,
  getRemediationPlanById,
  syncPlanVulnerabilities,
  updateRemediationPlan,
} from "@/lib/remediation/plans";

const updateSchema = z.object({
  name: z.string().min(3).max(180).optional(),
  description: z.string().max(4000).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "BLOCKED", "COMPLETED", "ARCHIVED"]).optional(),
  vulnerabilityIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const plan = await getRemediationPlanById(id, authResult.context.organizationId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

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

  const payload = parsed.data;
  const { id } = await params;

  const updated = await updateRemediationPlan(id, authResult.context.organizationId, {
    ...(typeof payload.name !== "undefined" ? { name: payload.name } : {}),
    ...(typeof payload.description !== "undefined" ? { description: payload.description } : {}),
    ...(typeof payload.ownerId !== "undefined" ? { ownerId: payload.ownerId } : {}),
    ...(typeof payload.dueDate !== "undefined"
      ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null }
      : {}),
    ...(typeof payload.status !== "undefined" ? { status: payload.status } : {}),
  });

  if (payload.vulnerabilityIds) {
    await syncPlanVulnerabilities(id, authResult.context.organizationId, payload.vulnerabilityIds);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  await deleteRemediationPlan(id, authResult.context.organizationId);
  return NextResponse.json({ success: true });
}
