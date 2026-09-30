import type { ThreatFeedType } from "@repo/database";
import type { NormalizedIndicatorInput } from "../types";

export interface ThreatFeedAdapterHealth {
  message: string;
  ok: boolean;
}

export interface AdapterFetchResult<TRaw> {
  checkpoint: string | null;
  records: TRaw[];
  warnings: string[];
}

export interface AdapterContext {
  organizationId: string;
  sourceName: string;
}

export interface ThreatFeedAdapter<TRaw = unknown> {
  readonly feedType: ThreatFeedType;
  fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<TRaw>>;
  health(): Promise<ThreatFeedAdapterHealth>;
  normalize(
    record: TRaw,
    context: AdapterContext
  ): NormalizedIndicatorInput | null;
  readonly source: string;
}
