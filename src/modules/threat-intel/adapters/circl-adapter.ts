import type { Severity } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";
import type { AdapterContext, AdapterFetchResult, ThreatFeedAdapter, ThreatFeedAdapterHealth } from "./types";
import { fetchJsonWithRetry } from "../utils/http";
import { calculateConfidence, calculateExpirationDate } from "../ioc/scoring";
import { normalizeIndicatorValue } from "../ioc/normalizer";
import type { NormalizedIndicatorInput } from "../types";

interface CirclRecord {
  id: string;
  cveId: string;
  publishedAt: Date;
}

function collectCveIds(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const matches = value.match(/CVE-\d{4}-\d{4,7}/gi);
    if (matches) {
      for (const match of matches) {
        out.add(match.toUpperCase());
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCveIds(item, out);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectCveIds(entry, out);
    }
  }
}

export class CirclAdapter implements ThreatFeedAdapter<CirclRecord> {
  readonly source = "CIRCL";
  readonly feedType = "CVE" as const;

  constructor(private readonly config: ThreatIntelConfig) {}

  async fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<CirclRecord>> {
    void checkpoint;
    const data = await fetchJsonWithRetry<unknown[]>({
      url: `${this.config.feeds.circlApiBaseUrl.replace(/\/$/, "")}/last`,
      headers: {
        Accept: "application/json",
      },
      timeoutMs: this.config.ingestion.timeoutMs,
      maxRetries: this.config.ingestion.maxRetries,
      baseBackoffMs: this.config.ingestion.baseBackoffMs,
    });

    const records: CirclRecord[] = [];

    for (const advisory of data) {
      const cves = new Set<string>();
      collectCveIds(advisory, cves);

      const published = (() => {
        if (advisory && typeof advisory === "object") {
          const candidate = (advisory as Record<string, unknown>).published;
          if (typeof candidate === "string") {
            const parsed = new Date(candidate);
            if (!Number.isNaN(parsed.getTime())) {
              return parsed;
            }
          }
        }

        return new Date();
      })();

      for (const cveId of cves) {
        records.push({
          id: `${cveId}-${published.toISOString()}`,
          cveId,
          publishedAt: published,
        });
      }
    }

    return {
      records,
      checkpoint: new Date().toISOString(),
      warnings: [],
    };
  }

  normalize(record: CirclRecord, context: AdapterContext): NormalizedIndicatorInput {
    void context;
    const normalizedValue = normalizeIndicatorValue("CVE", record.cveId);
    const confidence = calculateConfidence({
      source: this.source,
      firstSeen: record.publishedAt,
      lastSeen: record.publishedAt,
      severity: "MEDIUM" satisfies Severity,
    });

    return {
      type: "CVE",
      value: record.cveId,
      normalizedValue,
      confidence,
      severity: "MEDIUM",
      firstSeen: record.publishedAt,
      lastSeen: record.publishedAt,
      expiresAt: calculateExpirationDate("CVE", record.publishedAt, this.config),
      source: this.source,
      description: "CIRCL advisory reference",
      tags: ["circl", "advisory"],
      metadata: {
        recordId: record.id,
      },
    };
  }

  async health(): Promise<ThreatFeedAdapterHealth> {
    try {
      await fetchJsonWithRetry<unknown[]>({
        url: `${this.config.feeds.circlApiBaseUrl.replace(/\/$/, "")}/last`,
        timeoutMs: this.config.ingestion.timeoutMs,
        maxRetries: 1,
        baseBackoffMs: this.config.ingestion.baseBackoffMs,
      });
      return { ok: true, message: "CIRCL reachable" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "CIRCL health check failed",
      };
    }
  }
}
