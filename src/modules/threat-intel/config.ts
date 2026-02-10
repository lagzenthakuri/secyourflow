export interface ThreatIntelConfig {
  features: {
    enabled: boolean;
    attackMatrixEnabled: boolean;
    iocCorrelationEnabled: boolean;
  };
  ingestion: {
    timeoutMs: number;
    maxRetries: number;
    baseBackoffMs: number;
    defaultSyncIntervalSeconds: number;
  };
  mitre: {
    taxiiDiscoveryUrl: string;
    enterpriseCollectionId: string;
  };
  feeds: {
    otxApiKey: string | null;
    circlApiBaseUrl: string;
    urlhausAuthKey: string | null;
    malwareBazaarAuthKey: string | null;
  };
  scoring: {
    highConfidenceThreshold: number;
    defaultExpirationDays: {
      IP_ADDRESS: number;
      DOMAIN: number;
      URL: number;
      FILE_HASH: number;
      CVE: number;
      OTHER: number;
    };
  };
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function toInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getThreatIntelConfig(): ThreatIntelConfig {
  return {
    features: {
      enabled: toBoolean(process.env.THREAT_INTEL_ENABLED, true),
      attackMatrixEnabled: toBoolean(process.env.ATTACK_MATRIX_ENABLED, true),
      iocCorrelationEnabled: toBoolean(process.env.IOC_CORRELATION_ENABLED, true),
    },
    ingestion: {
      timeoutMs: toInteger(process.env.THREAT_INTEL_TIMEOUT_MS, 15000),
      maxRetries: toInteger(process.env.THREAT_INTEL_MAX_RETRIES, 3),
      baseBackoffMs: toInteger(process.env.THREAT_INTEL_BACKOFF_MS, 750),
      defaultSyncIntervalSeconds: toInteger(process.env.THREAT_INTEL_DEFAULT_SYNC_INTERVAL, 3600),
    },
    mitre: {
      taxiiDiscoveryUrl: process.env.MITRE_ATTACK_TAXII_DISCOVERY_URL || "https://attack-taxii.mitre.org/taxii2/",
      enterpriseCollectionId:
        process.env.MITRE_ATTACK_ENTERPRISE_COLLECTION_ID ||
        "x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019",
    },
    feeds: {
      otxApiKey: process.env.OTX_API_KEY || null,
      circlApiBaseUrl: process.env.CIRCL_API_BASE_URL || "https://vulnerability.circl.lu/api",
      urlhausAuthKey: process.env.URLHAUS_AUTH_KEY || null,
      malwareBazaarAuthKey: process.env.MALWAREBAZAAR_AUTH_KEY || null,
    },
    scoring: {
      highConfidenceThreshold: toInteger(process.env.THREAT_INTEL_HIGH_CONFIDENCE_THRESHOLD, 75),
      defaultExpirationDays: {
        IP_ADDRESS: toInteger(process.env.THREAT_INTEL_EXPIRE_IP_DAYS, 14),
        DOMAIN: toInteger(process.env.THREAT_INTEL_EXPIRE_DOMAIN_DAYS, 30),
        URL: toInteger(process.env.THREAT_INTEL_EXPIRE_URL_DAYS, 7),
        FILE_HASH: toInteger(process.env.THREAT_INTEL_EXPIRE_HASH_DAYS, 120),
        CVE: toInteger(process.env.THREAT_INTEL_EXPIRE_CVE_DAYS, 365),
        OTHER: toInteger(process.env.THREAT_INTEL_EXPIRE_OTHER_DAYS, 30),
      },
    },
  };
}
