import type {
  AttackMappingSource,
  IndicatorType,
  Severity,
  ThreatFeedFormat,
  ThreatFeedType,
  ThreatMatchStatus,
} from "@repo/database";

export interface ThreatIngestionCheckpoint {
  cursor: string | null;
  lastSuccessAt: Date | null;
}

export interface NormalizedIndicatorInput {
  confidence: number | null;
  description: string | null;
  expiresAt: Date | null;
  firstSeen: Date;
  lastSeen: Date;
  metadata?: Record<string, unknown> | null;
  normalizedValue: string;
  severity: Severity | null;
  source: string;
  tacticId?: string | null;
  tags: string[];
  techniqueId?: string | null;
  type: IndicatorType;
  value: string;
}

export interface ThreatFeedUpsertInput {
  apiKey?: string | null;
  format: ThreatFeedFormat;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  name: string;
  source: string;
  syncInterval?: number;
  type: ThreatFeedType;
  url?: string | null;
}

export interface ThreatFeedRunSummary {
  checkpoint: string | null;
  created: number;
  errors: string[];
  fetched: number;
  skipped: number;
  updated: number;
}

export interface AttackTechniqueMappingInput {
  confidence: number | null;
  mappingSource: AttackMappingSource;
  notes?: string;
  techniqueExternalId: string;
  vulnerabilityId: string;
}

export interface ThreatIndicatorMatchInput {
  assetId: string;
  confidence: number | null;
  indicatorId: string;
  matchField: string;
  matchValue: string;
  notes?: string;
  organizationId: string;
  status?: ThreatMatchStatus;
}
