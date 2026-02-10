import type { ThreatFeedType } from "@prisma/client";
import type { NormalizedIndicatorInput } from "../types";

export interface ThreatFeedAdapterHealth {
  ok: boolean;
  message: string;
}

export interface AdapterFetchResult<TRaw> {
  records: TRaw[];
  checkpoint: string | null;
  warnings: string[];
}

export interface AdapterContext {
  organizationId: string;
  sourceName: string;
}

export interface ThreatFeedAdapter<TRaw = unknown> {
  readonly source: string;
  readonly feedType: ThreatFeedType;
  fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<TRaw>>;
  normalize(record: TRaw, context: AdapterContext): NormalizedIndicatorInput | null;
  health(): Promise<ThreatFeedAdapterHealth>;
}
