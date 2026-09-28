import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
  createRemediationPlan,
  getRemediationPlans,
  RemediationPlanError,
} from "@/lib/remediation/plans";

const createSchema = z.object({
  name: z.string().min(3).max(180),
  description: z.string().max(4000).optional(),
  ownerId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "BLOCKED", "COMPLETED", "ARCHIVED"]).optional(),
  vulnerabilityIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const data = await getRemediationPlans(authResult.context.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const payload = parsed.data;
    const plan = await createRemediationPlan({
      organizationId: authResult.context.organizationId,
      ownerId: payload.ownerId,
      name: payload.name,
      description: payload.description,
      status: payload.status,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      vulnerabilityIds: payload.vulnerabilityIds,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    if (error instanceof RemediationPlanError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create remediation plan" }, { status: 500 });
  }
}
