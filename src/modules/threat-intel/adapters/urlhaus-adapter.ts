import type { Severity } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";
import type { AdapterContext, AdapterFetchResult, ThreatFeedAdapter, ThreatFeedAdapterHealth } from "./types";
import { fetchJsonWithRetry } from "../utils/http";
import { calculateConfidence, calculateExpirationDate } from "../ioc/scoring";
import { normalizeIndicatorValue } from "../ioc/normalizer";
import type { NormalizedIndicatorInput } from "../types";

interface UrlhausResponse {
  query_status: string;
  urls?: Array<{
    id?: string;
    url?: string;
    date_added?: string;
    threat?: string;
    tags?: string[];
    url_status?: string;
  }>;
}

interface UrlhausRecord {
  id: string;
  url: string;
  firstSeen: Date;
  tags: string[];
  threat: string | null;
}

export class UrlhausAdapter implements ThreatFeedAdapter<UrlhausRecord> {
  readonly source = "URLHAUS";
  readonly feedType = "IOC" as const;

  constructor(private readonly config: ThreatIntelConfig) {}

  async fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<UrlhausRecord>> {
    void checkpoint;
    if (!this.config.feeds.urlhausAuthKey) {
      return {
        records: [],
        checkpoint: null,
        warnings: ["URLHAUS_AUTH_KEY not configured"],
      };
    }

    const payload = await fetchJsonWithRetry<UrlhausResponse>({
      url: "https://urlhaus-api.abuse.ch/v1/urls/recent/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Auth-Key": this.config.feeds.urlhausAuthKey,
      },
      body: "query=get_recent&selector=time",
      timeoutMs: this.config.ingestion.timeoutMs,
      maxRetries: this.config.ingestion.maxRetries,
      baseBackoffMs: this.config.ingestion.baseBackoffMs,
    });

    const records: UrlhausRecord[] = [];
    for (const item of payload.urls ?? []) {
      if (!item.url) continue;
      const firstSeen = item.date_added ? new Date(item.date_added) : new Date();
      records.push({
        id: item.id || `${item.url}-${firstSeen.toISOString()}`,
        url: item.url,
        firstSeen,
        tags: item.tags ?? [],
        threat: item.threat ?? null,
      });
    }

    return {
      records,
      checkpoint: new Date().toISOString(),
      warnings: payload.query_status === "ok" ? [] : [`URLhaus query status: ${payload.query_status}`],
    };
  }

  normalize(record: UrlhausRecord, context: AdapterContext): NormalizedIndicatorInput {
    void context;
    const normalizedValue = normalizeIndicatorValue("URL", record.url);
    const severity = record.threat?.toLowerCase().includes("malware") ? "HIGH" : "MEDIUM";
    const confidence = calculateConfidence({
      source: this.source,
      firstSeen: record.firstSeen,
      lastSeen: record.firstSeen,
      severity: severity as Severity,
    });

    return {
      type: "URL",
      value: record.url,
      normalizedValue,
      confidence,
      severity: severity as Severity,
      firstSeen: record.firstSeen,
      lastSeen: record.firstSeen,
      expiresAt: calculateExpirationDate("URL", record.firstSeen, this.config),
      source: this.source,
      description: record.threat,
      tags: [...record.tags, "urlhaus"],
      metadata: {
        externalId: record.id,
      },
    };
  }

  async health(): Promise<ThreatFeedAdapterHealth> {
    if (!this.config.feeds.urlhausAuthKey) {
      return { ok: false, message: "URLhaus auth key missing" };
    }

    try {
      await fetchJsonWithRetry<UrlhausResponse>({
        url: "https://urlhaus-api.abuse.ch/v1/urls/recent/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Auth-Key": this.config.feeds.urlhausAuthKey,
        },
        body: "query=get_recent&selector=time",
        timeoutMs: this.config.ingestion.timeoutMs,
        maxRetries: 1,
        baseBackoffMs: this.config.ingestion.baseBackoffMs,
      });

      return { ok: true, message: "URLhaus reachable" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "URLhaus health check failed",
      };
    }
  }
}
