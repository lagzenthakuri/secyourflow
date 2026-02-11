import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { addRemediationEvidence } from "@/lib/remediation/plans";

const createEvidenceSchema = z.object({
  title: z.string().min(2).max(180),
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  contentBase64: z.string().optional(),
  notes: z.string().max(4000).optional(),
  vulnerabilityId: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const plan = await prisma.remediationPlan.findFirst({
    where: { id, organizationId: authResult.context.organizationId },
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const evidence = await prisma.remediationEvidence.findMany({
    where: { planId: id, organizationId: authResult.context.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: evidence });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = createEvidenceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid evidence payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const payload = parsed.data;

  const plan = await prisma.remediationPlan.findFirst({
    where: { id, organizationId: authResult.context.organizationId },
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const content = payload.contentBase64 ? Buffer.from(payload.contentBase64, "base64") : Buffer.from("");
  const checksum = crypto.createHash("sha256").update(content).digest("hex");

  const created = await addRemediationEvidence({
    organizationId: authResult.context.organizationId,
    uploadedById: authResult.context.userId,
    planId: id,
    vulnerabilityId: payload.vulnerabilityId,
    title: payload.title,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    sizeBytes: content.byteLength,
    storagePath: `inline://remediation/${id}/${Date.now()}_${payload.fileName}`,
    checksum,
    notes: payload.notes,
  });

  return NextResponse.json(created, { status: 201 });
}
