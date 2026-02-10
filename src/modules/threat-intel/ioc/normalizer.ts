import type { IndicatorType } from "@prisma/client";

function normalizeUrlValue(value: string): string {
  try {
    const parsed = new URL(value.trim());
    parsed.hostname = parsed.hostname.toLowerCase();
    if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }

    if (parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return value.trim().toLowerCase();
  }
}

function normalizeDomainValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
}

export function normalizeIndicatorValue(type: IndicatorType, value: string): string {
  switch (type) {
    case "IP_ADDRESS":
      return value.trim().toLowerCase();
    case "DOMAIN":
      return normalizeDomainValue(value);
    case "URL":
      return normalizeUrlValue(value);
    case "FILE_HASH_MD5":
    case "FILE_HASH_SHA1":
    case "FILE_HASH_SHA256":
      return value.trim().toLowerCase();
    case "EMAIL":
      return value.trim().toLowerCase();
    case "CVE":
      return value.trim().toUpperCase();
    case "REGISTRY_KEY":
    case "USER_AGENT":
      return value.trim();
    default:
      return value.trim().toLowerCase();
  }
}

const hashPatternByType: Record<IndicatorType, RegExp | null> = {
  IP_ADDRESS: null,
  DOMAIN: null,
  URL: null,
  FILE_HASH_MD5: /^[a-fA-F0-9]{32}$/,
  FILE_HASH_SHA1: /^[a-fA-F0-9]{40}$/,
  FILE_HASH_SHA256: /^[a-fA-F0-9]{64}$/,
  EMAIL: null,
  CVE: /^CVE-\d{4}-\d{4,}$/i,
  REGISTRY_KEY: null,
  USER_AGENT: null,
};

export function isValidIndicatorValue(type: IndicatorType, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  switch (type) {
    case "IP_ADDRESS": {
      const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
      const ipv6 = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
      return ipv4.test(trimmed) || ipv6.test(trimmed);
    }
    case "DOMAIN":
      return /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(trimmed);
    case "URL":
      return /^https?:\/\//i.test(trimmed);
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    default: {
      const pattern = hashPatternByType[type];
      return pattern ? pattern.test(trimmed) : true;
    }
  }
}

export function guessIndicatorType(value: string): IndicatorType {
  const trimmed = value.trim();
  if (/^CVE-\d{4}-\d{4,}$/i.test(trimmed)) {
    return "CVE";
  }

  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return "FILE_HASH_SHA256";
  }

  if (/^[a-fA-F0-9]{40}$/.test(trimmed)) {
    return "FILE_HASH_SHA1";
  }

  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) {
    return "FILE_HASH_MD5";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return "URL";
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "EMAIL";
  }

  if (/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(trimmed)) {
    return "IP_ADDRESS";
  }

  if (/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(trimmed)) {
    return "DOMAIN";
  }

  return "USER_AGENT";
}
