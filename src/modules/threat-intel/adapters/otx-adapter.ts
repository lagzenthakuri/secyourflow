import type { IndicatorType, Severity } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";
import { fetchJsonWithRetry } from "../utils/http";
import type { AdapterContext, AdapterFetchResult, ThreatFeedAdapter, ThreatFeedAdapterHealth } from "./types";
import { calculateConfidence, calculateExpirationDate } from "../ioc/scoring";
import { normalizeIndicatorValue } from "../ioc/normalizer";
import type { NormalizedIndicatorInput } from "../types";

interface OtxPulseResponse {
  results?: OtxPulse[];
}

interface OtxPulse {
  id: string;
  modified?: string;
  created?: string;
  name?: string;
  tags?: string[];
  indicators?: Array<{
    indicator?: string;
    type?: string;
    title?: string;
    created?: string;
  }>;
}

interface OtxIndicatorRecord {
  pulseId: string;
  pulseName: string;
  indicatorValue: string;
  indicatorType: string;
  tags: string[];
  createdAt: string | null;
}

function mapOtxTypeToIndicator(type: string): IndicatorType | null {
  const normalized = type.toLowerCase();
  if (normalized === "ipv4" || normalized === "ipv6") return "IP_ADDRESS";
  if (normalized === "domain") return "DOMAIN";
  if (normalized === "url") return "URL";
  if (normalized === "filehash-md5") return "FILE_HASH_MD5";
  if (normalized === "filehash-sha1") return "FILE_HASH_SHA1";
  if (normalized === "filehash-sha256") return "FILE_HASH_SHA256";
  if (normalized === "email") return "EMAIL";
  if (normalized === "cve") return "CVE";
  if (normalized === "useragent") return "USER_AGENT";
  return null;
}

export class OtxAdapter implements ThreatFeedAdapter<OtxIndicatorRecord> {
  readonly source = "ALIENVAULT_OTX";
  readonly feedType = "IOC" as const;

  constructor(private readonly config: ThreatIntelConfig) {}

  async fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<OtxIndicatorRecord>> {
    void checkpoint;
    if (!this.config.feeds.otxApiKey) {
      return {
        records: [],
        checkpoint: null,
        warnings: ["OTX_API_KEY not configured"],
      };
    }

    const payload = await fetchJsonWithRetry<OtxPulseResponse>({
      url: "https://otx.alienvault.com/api/v1/pulses/subscribed?limit=50",
      headers: {
        "X-OTX-API-KEY": this.config.feeds.otxApiKey,
        Accept: "application/json",
      },
      timeoutMs: this.config.ingestion.timeoutMs,
      maxRetries: this.config.ingestion.maxRetries,
      baseBackoffMs: this.config.ingestion.baseBackoffMs,
    });

    const records: OtxIndicatorRecord[] = [];

    for (const pulse of payload.results ?? []) {
      for (const indicator of pulse.indicators ?? []) {
        if (!indicator.indicator || !indicator.type) continue;
        records.push({
          pulseId: pulse.id,
          pulseName: pulse.name || "OTX Pulse",
          indicatorValue: indicator.indicator,
          indicatorType: indicator.type,
          tags: pulse.tags ?? [],
          createdAt: indicator.created ?? pulse.modified ?? pulse.created ?? null,
        });
      }
    }

    return {
      records,
      checkpoint: new Date().toISOString(),
      warnings: [],
    };
  }

  normalize(record: OtxIndicatorRecord, context: AdapterContext): NormalizedIndicatorInput | null {
    void context;
    const mappedType = mapOtxTypeToIndicator(record.indicatorType);
    if (!mappedType) {
      return null;
    }

    const firstSeen = record.createdAt ? new Date(record.createdAt) : new Date();
    const normalizedValue = normalizeIndicatorValue(mappedType, record.indicatorValue);
    const confidence = calculateConfidence({
      source: this.source,
      firstSeen,
      lastSeen: firstSeen,
      severity: "MEDIUM" satisfies Severity,
    });

    return {
      type: mappedType,
      value: record.indicatorValue,
      normalizedValue,
      confidence,
      severity: "MEDIUM",
      firstSeen,
      lastSeen: firstSeen,
      expiresAt: calculateExpirationDate(mappedType, firstSeen, this.config),
      source: this.source,
      description: `${record.pulseName} (${record.pulseId})`,
      tags: [...record.tags, "otx"],
      metadata: {
        pulseId: record.pulseId,
      },
    };
  }

  async health(): Promise<ThreatFeedAdapterHealth> {
    if (!this.config.feeds.otxApiKey) {
      return { ok: false, message: "OTX API key missing" };
    }

    try {
      await fetchJsonWithRetry<{ detail?: string }>({
        url: "https://otx.alienvault.com/api/v1/pulses/subscribed?limit=1",
        headers: {
          "X-OTX-API-KEY": this.config.feeds.otxApiKey,
          Accept: "application/json",
        },
        timeoutMs: this.config.ingestion.timeoutMs,
        maxRetries: 1,
        baseBackoffMs: this.config.ingestion.baseBackoffMs,
      });

      return { ok: true, message: "OTX reachable" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "OTX health check failed",
      };
    }
  }
}
