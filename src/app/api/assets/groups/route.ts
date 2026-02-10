import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
  createAssetGroup,
  deleteAssetGroup,
  listAssetGroups,
  updateAssetGroup,
} from "@/lib/assets/groups";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  color: z.string().max(32).optional(),
  assetIds: z.array(z.string()).optional(),
});

const patchSchema = createSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const data = await listAssetGroups(authResult.context.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid group payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await createAssetGroup({
    organizationId: authResult.context.organizationId,
    createdById: authResult.context.userId,
    ...parsed.data,
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid group update payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updateAssetGroup({
      organizationId: authResult.context.organizationId,
      ...parsed.data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await deleteAssetGroup({
      organizationId: authResult.context.organizationId,
      id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 },
    );
  }
}
