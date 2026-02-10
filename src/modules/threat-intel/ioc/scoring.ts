import type { IndicatorType, Severity } from "@prisma/client";
import type { ThreatIntelConfig } from "../config";

const SOURCE_TRUST_WEIGHTS: Record<string, number> = {
  "ALIENVAULT_OTX": 65,
  "CIRCL": 60,
  "URLHAUS": 78,
  "MALWAREBAZAAR": 82,
  "CUSTOM": 50,
  "MITRE_ATTACK": 88,
  "MANUAL": 95,
};

const SEVERITY_BOOST: Partial<Record<Severity, number>> = {
  CRITICAL: 12,
  HIGH: 8,
  MEDIUM: 4,
  LOW: 2,
  INFORMATIONAL: 0,
};

export interface ConfidenceInput {
  source: string;
  feedProvidedConfidence?: number | null;
  firstSeen?: Date | null;
  lastSeen?: Date | null;
  severity?: Severity | null;
}

export function calculateConfidence(input: ConfidenceInput): number {
  const trustBase = SOURCE_TRUST_WEIGHTS[input.source.toUpperCase()] ?? 45;
  const feedScore = Math.max(0, Math.min(100, input.feedProvidedConfidence ?? trustBase));

  let recencyBoost = 0;
  const lastSeen = input.lastSeen ?? input.firstSeen;
  if (lastSeen) {
    const ageDays = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) {
      recencyBoost = 10;
    } else if (ageDays <= 7) {
      recencyBoost = 6;
    } else if (ageDays <= 30) {
      recencyBoost = 2;
    } else {
      recencyBoost = -8;
    }
  }

  const severityBoost = input.severity ? SEVERITY_BOOST[input.severity] ?? 0 : 0;
  const weighted = Math.round((feedScore * 0.6) + (trustBase * 0.4) + recencyBoost + severityBoost);
  return Math.max(0, Math.min(100, weighted));
}

function expirationDaysForType(type: IndicatorType, config: ThreatIntelConfig): number {
  switch (type) {
    case "IP_ADDRESS":
      return config.scoring.defaultExpirationDays.IP_ADDRESS;
    case "DOMAIN":
      return config.scoring.defaultExpirationDays.DOMAIN;
    case "URL":
      return config.scoring.defaultExpirationDays.URL;
    case "FILE_HASH_MD5":
    case "FILE_HASH_SHA1":
    case "FILE_HASH_SHA256":
      return config.scoring.defaultExpirationDays.FILE_HASH;
    case "CVE":
      return config.scoring.defaultExpirationDays.CVE;
    default:
      return config.scoring.defaultExpirationDays.OTHER;
  }
}

export function calculateExpirationDate(
  type: IndicatorType,
  referenceDate: Date,
  config: ThreatIntelConfig,
): Date {
  const days = expirationDaysForType(type, config);
  return new Date(referenceDate.getTime() + (days * 24 * 60 * 60 * 1000));
}
