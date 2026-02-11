import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { DiscoveredAssetRecord } from "@/lib/discovery/adapters/types";

interface ParsedHost {
  hostname?: string;
  ipAddress?: string;
  status: string;
  openPorts: number[];
}

function extractTagValue(block: string, tagPattern: RegExp): string | undefined {
  const match = block.match(tagPattern);
  return match?.[1];
}

function parseHostBlock(block: string): ParsedHost {
  const ipAddress = extractTagValue(block, /<address[^>]*addr="([^"]+)"[^>]*addrtype="ipv4"[^>]*\/?>/i);
  const hostname = extractTagValue(
    block,
    /<hostname[^>]*name="([^"]+)"[^>]*\/?>/i,
  );
  const status = extractTagValue(block, /<status[^>]*state="([^"]+)"[^>]*\/?>/i) || "unknown";

  const openPorts: number[] = [];
  const portRegex = /<port[^>]*portid="(\d+)"[^>]*>[\s\S]*?<state[^>]*state="open"[^>]*\/?>(?:<\/state>)?[\s\S]*?<\/port>/gi;
  let portMatch: RegExpExecArray | null = null;
  while ((portMatch = portRegex.exec(block))) {
    const port = Number(portMatch[1]);
    if (!Number.isNaN(port)) {
      openPorts.push(port);
    }
  }

  return { hostname, ipAddress, status, openPorts };
}

export function parseNmapXml(xml: string): DiscoveredAssetRecord[] {
  const hostBlocks = xml.match(/<host>[\s\S]*?<\/host>/gi) || [];

  return hostBlocks
    .map(parseHostBlock)
    .filter((host) => host.status === "up" && (host.ipAddress || host.hostname))
    .map((host) => ({
      name: host.hostname || host.ipAddress || "Discovered Host",
      type: "SERVER",
      hostname: host.hostname,
      ipAddress: host.ipAddress,
      environment: "PRODUCTION",
      criticality: "MEDIUM",
      status: "ACTIVE",
      tags: ["discovered", "nmap"],
      metadata: {
        source: "nmap",
        openPorts: host.openPorts,
      },
    }));
}

export async function importDiscoveredAssets(params: {
  organizationId: string;
  source: string;
  actorId?: string;
  rawInput: Record<string, unknown> | string;
  assets: DiscoveredAssetRecord[];
}) {
  const run = await prisma.assetDiscoveryRun.create({
    data: {
      organizationId: params.organizationId,
      source: params.source,
      status: "RUNNING",
      rawInput:
        typeof params.rawInput === "string"
          ? ({ raw: params.rawInput } as Prisma.InputJsonValue)
          : (params.rawInput as Prisma.InputJsonValue),
    },
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const record of params.assets) {
    const existing = await prisma.asset.findFirst({
      where: {
        organizationId: params.organizationId,
        OR: [
          ...(record.hostname ? [{ hostname: record.hostname }] : []),
          ...(record.ipAddress ? [{ ipAddress: record.ipAddress }] : []),
          { name: record.name },
        ],
      },
      select: { id: true },
    });

    const asset = existing
      ? await prisma.asset.update({
          where: { id: existing.id },
          data: {
            name: record.name,
            type: record.type,
            hostname: record.hostname,
            ipAddress: record.ipAddress,
            operatingSystem: record.operatingSystem,
            environment: record.environment || "PRODUCTION",
            criticality: record.criticality || "MEDIUM",
            status: record.status || "ACTIVE",
            owner: record.owner,
            department: record.department,
            location: record.location,
            cloudProvider: record.cloudProvider,
            cloudRegion: record.cloudRegion,
            cloudAccountId: record.cloudAccountId,
            tags: record.tags || [],
            metadata: record.metadata as Prisma.InputJsonValue | undefined,
            lastSeen: new Date(),
          },
        })
      : await prisma.asset.create({
          data: {
            organizationId: params.organizationId,
            name: record.name,
            type: record.type,
            hostname: record.hostname,
            ipAddress: record.ipAddress,
            operatingSystem: record.operatingSystem,
            environment: record.environment || "PRODUCTION",
            criticality: record.criticality || "MEDIUM",
            status: record.status || "ACTIVE",
            owner: record.owner,
            department: record.department,
            location: record.location,
            cloudProvider: record.cloudProvider,
            cloudRegion: record.cloudRegion,
            cloudAccountId: record.cloudAccountId,
            tags: record.tags || [],
            metadata: record.metadata as Prisma.InputJsonValue | undefined,
            lastSeen: new Date(),
          },
        });

    await prisma.assetDiscoveryRunAsset.create({
      data: {
        discoveryRunId: run.id,
        assetId: asset.id,
        action: existing ? "UPDATED" : "CREATED",
      },
    });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  await prisma.assetDiscoveryRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      finishedAt: new Date(),
      discoveredCount: params.assets.length,
      createdCount,
      updatedCount,
      metadata: { actorId: params.actorId } as Prisma.InputJsonValue,
    },
  });

  return {
    runId: run.id,
    discoveredCount: params.assets.length,
    createdCount,
    updatedCount,
  };
}
