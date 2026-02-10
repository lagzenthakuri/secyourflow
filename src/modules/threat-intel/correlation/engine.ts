import { prisma } from "../../../lib/prisma";
import type { IndicatorType, ThreatMatchStatus } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";
import { normalizeIndicatorValue } from "../ioc/normalizer";
import { ThreatIntelRepository } from "../persistence/repository";

interface AssetRecord {
  id: string;
  name: string;
  ipAddress: string | null;
  hostname: string | null;
  metadata: unknown;
}

interface IndicatorRecord {
  id: string;
  type: IndicatorType;
  normalizedValue: string;
  confidence: number | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null;
  source: string | null;
}

function collectMetadataStringValues(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectMetadataStringValues(item, out);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectMetadataStringValues(entry, out);
    }
  }
}

export function matchesIndicator(indicator: IndicatorRecord, asset: AssetRecord): Array<{ field: string; value: string }> {
  const matches: Array<{ field: string; value: string }> = [];

  const candidateValues: Array<{ field: string; value: string }> = [];

  if (asset.ipAddress) candidateValues.push({ field: "ipAddress", value: asset.ipAddress });
  if (asset.hostname) candidateValues.push({ field: "hostname", value: asset.hostname });
  candidateValues.push({ field: "name", value: asset.name });

  const metadataStrings: string[] = [];
  collectMetadataStringValues(asset.metadata, metadataStrings);
  for (const entry of metadataStrings) {
    candidateValues.push({ field: "metadata", value: entry });
  }

  for (const candidate of candidateValues) {
    const normalizedCandidate = normalizeIndicatorValue(indicator.type, candidate.value);

    if (normalizedCandidate === indicator.normalizedValue) {
      matches.push({ field: candidate.field, value: candidate.value });
    }
  }

  return matches;
}

export interface CorrelationSummary {
  scannedIndicators: number;
  scannedAssets: number;
  matchesCreated: number;
  matchesUpdated: number;
  alertsGenerated: number;
}

export class IocCorrelationEngine {
  constructor(
    private readonly repository: ThreatIntelRepository,
    private readonly config: ThreatIntelConfig,
    private readonly notifyHighConfidenceMatch: (params: {
      organizationId: string;
      indicatorValue: string;
      assetName: string;
      matchField: string;
    }) => Promise<number> = async ({ organizationId, indicatorValue, assetName, matchField }) => {
      const recipients = await prisma.user.findMany({
        where: {
          organizationId,
          role: {
            in: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST"],
          },
        },
        select: { id: true },
      });

      if (recipients.length === 0) {
        return 0;
      }

      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: "High-confidence IOC match",
          message: `${indicatorValue} matched asset ${assetName} (${matchField}).`,
          type: "WARNING",
          link: "/threats",
        })),
      });

      return recipients.length;
    },
  ) {}

  async run(organizationId: string): Promise<CorrelationSummary> {
    const indicators = (await this.repository.listIndicators(organizationId, {
      includeExpired: false,
    })) as IndicatorRecord[];

    const assets = (await this.repository.listOrgAssets(organizationId)) as AssetRecord[];

    let matchesCreated = 0;
    let matchesUpdated = 0;
    let alertsGenerated = 0;

    for (const indicator of indicators) {
      for (const asset of assets) {
        const matches = matchesIndicator(indicator, asset);
        for (const match of matches) {
          const result = await this.repository.upsertIndicatorMatch({
            indicatorId: indicator.id,
            assetId: asset.id,
            organizationId,
            matchField: match.field,
            matchValue: match.value,
            confidence: indicator.confidence,
            status: "ACTIVE" as ThreatMatchStatus,
          });

          const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
          if (wasCreated) {
            matchesCreated += 1;
          } else {
            matchesUpdated += 1;
          }

          const confidence = indicator.confidence ?? 0;
          if (wasCreated && confidence >= this.config.scoring.highConfidenceThreshold) {
            alertsGenerated += await this.notifyHighConfidenceMatch({
              organizationId,
              indicatorValue: indicator.normalizedValue,
              assetName: asset.name,
              matchField: match.field,
            });
          }
        }
      }
    }

    return {
      scannedIndicators: indicators.length,
      scannedAssets: assets.length,
      matchesCreated,
      matchesUpdated,
      alertsGenerated,
    };
  }
}
