import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { importDiscoveredAssets } from "@/lib/scanners/nmap";

const discoveredAssetSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "SERVER",
    "WORKSTATION",
    "NETWORK_DEVICE",
    "CLOUD_INSTANCE",
    "CONTAINER",
    "DATABASE",
    "APPLICATION",
    "API",
    "DOMAIN",
    "CERTIFICATE",
    "IOT_DEVICE",
    "MOBILE_DEVICE",
    "OTHER",
  ]),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  operatingSystem: z.string().optional(),
  environment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING", "DR"]).optional(),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"]).optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  cloudProvider: z.enum(["AWS", "AZURE", "GCP", "ORACLE", "IBM", "ALIBABA", "OTHER"]).optional(),
  cloudRegion: z.string().optional(),
  cloudAccountId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const schema = z.object({
  source: z.string().min(2).default("import"),
  assets: z.array(discoveredAssetSchema).min(1),
  rawInput: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid discovery import payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await importDiscoveredAssets({
    organizationId: authResult.context.organizationId,
    source: parsed.data.source,
    actorId: authResult.context.userId,
    rawInput: parsed.data.rawInput || { source: parsed.data.source, imported: true },
    assets: parsed.data.assets,
  });

  return NextResponse.json(result);
}
