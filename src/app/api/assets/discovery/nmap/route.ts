import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { importDiscoveredAssets, parseNmapXml } from "@/lib/scanners/nmap";

const schema = z.object({
  xml: z.string().min(10),
});

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Nmap payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const discoveredAssets = parseNmapXml(parsed.data.xml);

  const result = await importDiscoveredAssets({
    organizationId: authResult.context.organizationId,
    source: "nmap",
    actorId: authResult.context.userId,
    rawInput: parsed.data.xml,
    assets: discoveredAssets,
  });

  return NextResponse.json({
    ...result,
    preview: discoveredAssets.slice(0, 20),
  });
}
