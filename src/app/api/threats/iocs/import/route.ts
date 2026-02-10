import { NextResponse } from "next/server";
import type { IndicatorType } from "@prisma/client";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelRepository } from "@/modules/threat-intel/persistence/repository";
import { guessIndicatorType, isValidIndicatorValue, normalizeIndicatorValue } from "@/modules/threat-intel/ioc/normalizer";
import { calculateConfidence, calculateExpirationDate } from "@/modules/threat-intel/ioc/scoring";
import { getThreatIntelConfig } from "@/modules/threat-intel/config";

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

function parseCsv(content: string): Array<Record<string, string>> {
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

function parseIndicatorType(value: string | undefined): IndicatorType | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  const validTypes: IndicatorType[] = [
    "IP_ADDRESS",
    "DOMAIN",
    "URL",
    "FILE_HASH_MD5",
    "FILE_HASH_SHA1",
    "FILE_HASH_SHA256",
    "EMAIL",
    "CVE",
    "REGISTRY_KEY",
    "USER_AGENT",
  ];

  return validTypes.includes(normalized as IndicatorType) ? (normalized as IndicatorType) : null;
}

interface ImportRow {
  value: string;
  type?: string;
  severity?: string;
  confidence?: number;
  description?: string;
  tags?: string[];
}

export async function POST(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const format = String(body.format || "JSON").toUpperCase();
    const payload = body.data;

    let rows: ImportRow[] = [];
    if (format === "CSV") {
      if (typeof payload !== "string") {
        return NextResponse.json({ error: "CSV import expects string payload" }, { status: 400 });
      }

      rows = parseCsv(payload).map((entry) => ({
        value: entry.value || entry.indicator || entry.ioc || "",
        type: entry.type,
        severity: entry.severity,
        confidence: entry.confidence ? Number.parseInt(entry.confidence, 10) : undefined,
        description: entry.description,
        tags: entry.tags ? entry.tags.split("|").map((tag) => tag.trim()).filter(Boolean) : undefined,
      }));
    } else {
      const arrayData = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)
          ? (payload as { data: unknown[] }).data
          : [];

      rows = arrayData
        .map((entry): ImportRow | null => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const value =
            typeof row.value === "string"
              ? row.value
              : typeof row.indicator === "string"
                ? row.indicator
                : "";
          if (!value) return null;

          const normalized: ImportRow = { value };
          if (typeof row.type === "string") normalized.type = row.type;
          if (typeof row.severity === "string") normalized.severity = row.severity;
          if (typeof row.confidence === "number") normalized.confidence = row.confidence;
          if (typeof row.description === "string") normalized.description = row.description;
          if (Array.isArray(row.tags)) {
            normalized.tags = row.tags.filter((tag): tag is string => typeof tag === "string");
          }

          return normalized;
        })
        .filter((entry): entry is ImportRow => entry !== null);
    }

    const repository = new ThreatIntelRepository();
    const orgId = authResult.context.organizationId;
    const config = getThreatIntelConfig();

    const feed = await repository.upsertFeed(orgId, {
      name: body.feedName ? String(body.feedName) : "Imported IOC Feed",
      source: "CUSTOM_IMPORT",
      type: "IOC",
      format: "JSON",
      isActive: true,
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const now = new Date();

    for (const row of rows) {
      const rawValue = row.value.trim();
      if (!rawValue) {
        skipped += 1;
        continue;
      }

      const type = parseIndicatorType(row.type) ?? guessIndicatorType(rawValue);
      if (!isValidIndicatorValue(type, rawValue)) {
        skipped += 1;
        errors.push(`Invalid IOC value for ${type}: ${rawValue}`);
        continue;
      }

      try {
        const normalizedValue = normalizeIndicatorValue(type, rawValue);
        const severity = row.severity?.toUpperCase();
        const normalizedSeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"].includes(severity ?? "")
          ? (severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL")
          : "MEDIUM";

        const confidence = row.confidence ?? calculateConfidence({
          source: "CUSTOM",
          firstSeen: now,
          lastSeen: now,
          severity: normalizedSeverity,
        });

        const upserted = await repository.upsertIndicator(orgId, feed.id, {
          type,
          value: rawValue,
          normalizedValue,
          confidence,
          severity: normalizedSeverity,
          firstSeen: now,
          lastSeen: now,
          expiresAt: calculateExpirationDate(type, now, config),
          source: "CUSTOM_IMPORT",
          description: row.description ?? "Imported IOC",
          tags: row.tags ?? [],
          metadata: {
            importedBy: authResult.context.userId,
          },
        });

        if (upserted.created) {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    return NextResponse.json({
      summary: {
        totalRows: rows.length,
        created,
        updated,
        skipped,
        errors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to import IOCs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
