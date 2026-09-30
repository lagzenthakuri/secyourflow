import type { Severity, VulnSource } from "@prisma/client";

/**
 * Common contract for every scanner integration, so the run endpoint can
 * dispatch on scanner type without knowing the vendor.
 */

export interface ScanTarget {
  assetId?: string;
  /** Hostname, IP, CIDR, image reference, or path — meaning is adapter-specific. */
  value: string;
}

export interface NormalizedFinding {
  cveId?: string;
  cvssScore?: number;
  cvssVector?: string;
  description?: string;
  /** Where on the target the finding sits, e.g. "tcp/443" or a package name. */
  location?: string;
  references?: string[];
  remediation?: string;
  severity: Severity;
  title: string;
}

export interface ScanOutcome {
  findings: NormalizedFinding[];
  hostsScanned: number;
  /** Untyped vendor payload, retained on ScanResult.rawData for audit. */
  raw: unknown;
  warnings?: string[];
}

export type ScannerExecution = "LOCAL_BINARY" | "REMOTE_API";

export interface ScannerAdapter {
  /** Reports whether this adapter can run right now, and why not. */
  available(config: ScannerRuntimeConfig): Promise<ScannerAvailability>;
  /** CLI binary this adapter shells out to, when local. */
  binary?: string;
  execution: ScannerExecution;
  label: string;
  /** Config fields the adapter needs on ScannerConfig. */
  requires: {
    endpoint?: boolean;
    apiKey?: boolean;
    username?: boolean;
    password?: boolean;
  };
  run(target: ScanTarget, config: ScannerRuntimeConfig): Promise<ScanOutcome>;
  /** Human description of what `ScanTarget.value` should contain. */
  targetHint: string;
  type: VulnSource;
}

export interface ScannerRuntimeConfig {
  apiKey?: string | null;
  endpoint?: string | null;
  password?: string | null;
  /** Upper bound on a single scan, enforced by the adapter. */
  timeoutMs?: number;
  username?: string | null;
}

export interface ScannerAvailability {
  available: boolean;
  error?: string;
  version?: string;
}

export const DEFAULT_SCAN_TIMEOUT_MS = 10 * 60 * 1000;

/** Maps a 0-10 CVSS base score onto the platform severity scale. */
export function severityFromCvss(score: number | undefined): Severity {
  if (score === undefined || Number.isNaN(score)) {
    return "INFORMATIONAL";
  }
  if (score >= 9) {
    return "CRITICAL";
  }
  if (score >= 7) {
    return "HIGH";
  }
  if (score >= 4) {
    return "MEDIUM";
  }
  if (score > 0) {
    return "LOW";
  }
  return "INFORMATIONAL";
}

/** Normalizes the many vendor severity spellings onto our enum. */
export function severityFromLabel(label: string | undefined | null): Severity {
  switch ((label ?? "").trim().toUpperCase()) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
    case "MODERATE":
      return "MEDIUM";
    case "LOW":
      return "LOW";
    default:
      return "INFORMATIONAL";
  }
}
