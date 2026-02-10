import type {
  IndicatorType,
  Severity,
  ThreatFeedFormat,
  ThreatFeedType,
  ThreatMatchStatus,
  AttackMappingSource,
} from "@prisma/client";

export interface ThreatIngestionCheckpoint {
  cursor: string | null;
  lastSuccessAt: Date | null;
}

export interface NormalizedIndicatorInput {
  type: IndicatorType;
  value: string;
  normalizedValue: string;
  confidence: number | null;
  severity: Severity | null;
  firstSeen: Date;
  lastSeen: Date;
  expiresAt: Date | null;
  source: string;
  description: string | null;
  tags: string[];
  tacticId?: string | null;
  techniqueId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ThreatFeedUpsertInput {
  name: string;
  source: string;
  type: ThreatFeedType;
  format: ThreatFeedFormat;
  url?: string | null;
  apiKey?: string | null;
  syncInterval?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface ThreatFeedRunSummary {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  checkpoint: string | null;
}

export interface AttackTechniqueMappingInput {
  vulnerabilityId: string;
  techniqueExternalId: string;
  mappingSource: AttackMappingSource;
  confidence: number | null;
  notes?: string;
}

export interface ThreatIndicatorMatchInput {
  indicatorId: string;
  assetId: string;
  organizationId: string;
  matchField: string;
  matchValue: string;
  confidence: number | null;
  status?: ThreatMatchStatus;
  notes?: string;
}
