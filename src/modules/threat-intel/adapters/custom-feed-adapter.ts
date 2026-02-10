import type { IndicatorType, ThreatFeedFormat } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";
import type { AdapterContext, AdapterFetchResult, ThreatFeedAdapter, ThreatFeedAdapterHealth } from "./types";
import { fetchWithRetry } from "../utils/http";
import { calculateConfidence, calculateExpirationDate } from "../ioc/scoring";
import { guessIndicatorType, normalizeIndicatorValue } from "../ioc/normalizer";
import type { NormalizedIndicatorInput } from "../types";

interface CustomFeedOptions {
  source: string;
  url: string;
  format: ThreatFeedFormat;
  apiKey?: string | null;
  headers?: Record<string, string>;
}

interface CustomRecord {
  type: IndicatorType;
  value: string;
  confidence: number | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null;
  description: string | null;
  tags: string[];
  firstSeen: Date;
  lastSeen: Date;
  expiresAt: Date | null;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = values[i] ?? "";
    }

    return row;
  });
}

function parseSeverity(value: string | null | undefined): CustomRecord["severity"] {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"].includes(normalized)) {
    return normalized as CustomRecord["severity"];
  }

  return null;
}

function toDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export class CustomFeedAdapter implements ThreatFeedAdapter<CustomRecord> {
  readonly source: string;
  readonly feedType = "IOC" as const;
  private readonly url: string;
  private readonly format: ThreatFeedFormat;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: ThreatIntelConfig, options: CustomFeedOptions) {
    this.source = options.source;
    this.url = options.url;
    this.format = options.format;
    this.headers = {
      Accept: "application/json",
      ...(options.headers ?? {}),
    };

    if (options.apiKey) {
      this.headers.Authorization = this.headers.Authorization || `Bearer ${options.apiKey}`;
    }
  }

  async fetchSince(checkpoint: string | null): Promise<AdapterFetchResult<CustomRecord>> {
    void checkpoint;
    const response = await fetchWithRetry({
      url: this.url,
      headers: this.headers,
      timeoutMs: this.config.ingestion.timeoutMs,
      maxRetries: this.config.ingestion.maxRetries,
      baseBackoffMs: this.config.ingestion.baseBackoffMs,
    });

    if (!response.ok) {
      throw new Error(`Custom feed ${this.source} failed (${response.status})`);
    }

    const now = new Date();
    let records: CustomRecord[] = [];

    if (this.format === "CSV") {
      const text = await response.text();
      records = parseCsv(text)
        .map((row) => {
          const value = row.value || row.indicator || row.ioc;
          if (!value) return null;

          const type = (row.type?.toUpperCase() as IndicatorType | undefined) ?? guessIndicatorType(value);
          const firstSeen = toDate(row.first_seen || row.firstseen, now);
          const lastSeen = toDate(row.last_seen || row.lastseen, firstSeen);
          return {
            type,
            value,
            confidence: row.confidence ? Number.parseInt(row.confidence, 10) : null,
            severity: parseSeverity(row.severity),
            description: row.description || null,
            tags: row.tags ? row.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : [],
            firstSeen,
            lastSeen,
            expiresAt: row.expires_at ? toDate(row.expires_at, lastSeen) : null,
          } satisfies CustomRecord;
        })
        .filter((entry): entry is CustomRecord => Boolean(entry));
    } else {
      const json = (await response.json()) as unknown;
      const items = Array.isArray(json)
        ? json
        : json && typeof json === "object" && Array.isArray((json as { data?: unknown[] }).data)
          ? (json as { data: unknown[] }).data
          : [];

      records = items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const value = typeof row.value === "string" ? row.value : typeof row.indicator === "string" ? row.indicator : null;
          if (!value) return null;

          const type = typeof row.type === "string" ? (row.type.toUpperCase() as IndicatorType) : guessIndicatorType(value);
          const firstSeen = toDate(typeof row.firstSeen === "string" ? row.firstSeen : typeof row.first_seen === "string" ? row.first_seen : null, now);
          const lastSeen = toDate(typeof row.lastSeen === "string" ? row.lastSeen : typeof row.last_seen === "string" ? row.last_seen : null, firstSeen);

          return {
            type,
            value,
            confidence: typeof row.confidence === "number" ? row.confidence : null,
            severity: parseSeverity(typeof row.severity === "string" ? row.severity : null),
            description: typeof row.description === "string" ? row.description : null,
            tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
            firstSeen,
            lastSeen,
            expiresAt: typeof row.expiresAt === "string" ? toDate(row.expiresAt, lastSeen) : null,
          } satisfies CustomRecord;
        })
        .filter((entry): entry is CustomRecord => Boolean(entry));
    }

    return {
      records,
      checkpoint: now.toISOString(),
      warnings: [],
    };
  }

  normalize(record: CustomRecord, context: AdapterContext): NormalizedIndicatorInput {
    void context;
    const normalizedValue = normalizeIndicatorValue(record.type, record.value);
    const confidence = record.confidence ?? calculateConfidence({
      source: this.source,
      firstSeen: record.firstSeen,
      lastSeen: record.lastSeen,
      severity: record.severity,
    });

    const expiresAt = record.expiresAt ?? calculateExpirationDate(record.type, record.lastSeen, this.config);

    return {
      type: record.type,
      value: record.value,
      normalizedValue,
      confidence,
      severity: record.severity,
      firstSeen: record.firstSeen,
      lastSeen: record.lastSeen,
      expiresAt,
      source: this.source,
      description: record.description,
      tags: record.tags,
      metadata: {
        custom: true,
      },
    };
  }

  async health(): Promise<ThreatFeedAdapterHealth> {
    try {
      const response = await fetchWithRetry({
        url: this.url,
        headers: this.headers,
        timeoutMs: this.config.ingestion.timeoutMs,
        maxRetries: 1,
        baseBackoffMs: this.config.ingestion.baseBackoffMs,
      });

      if (!response.ok) {
        return { ok: false, message: `Custom feed status ${response.status}` };
      }

      return { ok: true, message: "Custom feed reachable" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Custom feed health check failed",
      };
    }
  }
}
