import { NextResponse } from "next/server";
import type { IndicatorType, Severity } from "@prisma/client";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelRepository } from "@/modules/threat-intel/persistence/repository";
import { guessIndicatorType, isValidIndicatorValue, normalizeIndicatorValue } from "@/modules/threat-intel/ioc/normalizer";
import { calculateConfidence, calculateExpirationDate } from "@/modules/threat-intel/ioc/scoring";
import { getThreatIntelConfig } from "@/modules/threat-intel/config";

const severityValues = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] as const;

function parseIndicatorType(value: string): IndicatorType {
  const normalized = value.toUpperCase();
  const valid: IndicatorType[] = [
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

  return valid.includes(normalized as IndicatorType) ? (normalized as IndicatorType) : "USER_AGENT";
}

function parseSeverity(value: string | null): Severity | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  return severityValues.includes(normalized as Severity) ? (normalized as Severity) : undefined;
}

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const searchParams = new URL(request.url).searchParams;

  const type = searchParams.get("type");
  const severity = searchParams.get("severity");
  const search = searchParams.get("search");
  const includeExpired = searchParams.get("includeExpired") === "true";

  try {
    const repository = new ThreatIntelRepository();
    const indicators = await repository.listIndicators(authResult.context.organizationId, {
      type: type ? parseIndicatorType(type) : undefined,
      severity: parseSeverity(severity),
      search: search ?? undefined,
      includeExpired,
    });

    return NextResponse.json({ data: indicators });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch indicators",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const organizationId = authResult.context.organizationId;
    const repository = new ThreatIntelRepository();
    const config = getThreatIntelConfig();

    const rawValue = String(body.value || "").trim();
    if (!rawValue) {
      return NextResponse.json({ error: "IOC value is required" }, { status: 400 });
    }

    const type = body.type ? parseIndicatorType(String(body.type)) : guessIndicatorType(rawValue);
    if (!isValidIndicatorValue(type, rawValue)) {
      return NextResponse.json({ error: `Invalid IOC value for type ${type}` }, { status: 400 });
    }

    const feed = await repository.upsertFeed(organizationId, {
      name: "Manual IOC Entries",
      source: "MANUAL",
      type: "IOC",
      format: "JSON",
      isActive: true,
    });

    const now = new Date();
    const normalizedValue = normalizeIndicatorValue(type, rawValue);
    const severity = parseSeverity(body.severity ? String(body.severity) : null) ?? "MEDIUM";
    const confidence = body.confidence
      ? Number.parseInt(String(body.confidence), 10)
      : calculateConfidence({
          source: "MANUAL",
          firstSeen: now,
          lastSeen: now,
          severity,
        });

    const expiresAt = body.expiresAt
      ? new Date(String(body.expiresAt))
      : calculateExpirationDate(type, now, config);

    const upserted = await repository.upsertIndicator(organizationId, feed.id, {
      type,
      value: rawValue,
      normalizedValue,
      confidence,
      severity,
      firstSeen: now,
      lastSeen: now,
      expiresAt,
      source: "MANUAL",
      description: body.description ? String(body.description) : "Manual IOC entry",
      tags: Array.isArray(body.tags)
        ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string")
        : [],
      tacticId: body.tacticId ? String(body.tacticId) : null,
      techniqueId: body.techniqueId ? String(body.techniqueId) : null,
      metadata: {
        createdBy: authResult.context.userId,
      },
    });

    return NextResponse.json({ data: upserted.indicator }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create IOC",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
