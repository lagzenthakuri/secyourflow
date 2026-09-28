import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { NvdAdapter } from "@/modules/cve-search/adapters/nvd-adapter";
import { getCveSearchConfig } from "@/modules/cve-search/api/config";
import { logEvent } from "@/modules/cve-search/api/log";
import { internalServerError, jsonResponse } from "@/modules/cve-search/api/route-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const EPSS_API_URL = "https://api.first.org/data/v1/epss";
const TOP_N_RESULTS = 10;
const RECENT_DAYS_THRESHOLD = 90;
const BATCH_SIZE = 15;
const CACHE_TTL_MS = 5 * 60_000;
const TRENDING_KEV_RECENCY_DAYS = 21;
const TRENDING_EPSS_PERCENTILE_THRESHOLD = 85;
const TRENDING_CVSS_THRESHOLD = 9.0;
const CRITICAL_ZERO_DAY_THRESHOLD = 9.0;

const kevFeedSchema = z
  .object({
    catalogVersion: z.string().optional(),
    dateReleased: z.string().optional(),
    vulnerabilities: z
      .array(
        z
          .object({
            cveID: z.string(),
            vulnerabilityName: z.string().optional(),
            vendorProject: z.string().optional(),
            product: z.string().optional(),
            dateAdded: z.string().optional(),
            shortDescription: z.string().optional(),
            knownRansomwareCampaignUse: z.string().optional(),
            requiredAction: z.string().optional(),
            dueDate: z.string().optional(),
            notes: z.string().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

interface RankedCandidate {
  cveId: string;
  vulnerabilityName: string | undefined;
  dateAdded: string | undefined;
  knownRansomwareCampaignUse: string | undefined;
  product: string | undefined;
  vendorProject: string | undefined;
  shortDescription: string | undefined;
}

interface ThreatActiveItem {
  cveId: string;
  name: string;
  productSummary: string;
  cvssScore: number;
  dateAdded: string;
  link: string;
  epssScore: number;
  epssPercentile: number;
  trendScore: number;
}

interface ThreatActiveCacheEntry {
  expiresAt: number;
  catalogVersion: string | null;
  dateReleased: string | null;
  generatedAt: string;
  data: ThreatActiveItem[];
  recentMatchCount: number;
}

let threatActiveCache: ThreatActiveCacheEntry | null = null;

function parseDateToMs(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isKnownRansomware(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "known";
}

function pickName(vulnerabilityName: string | undefined, title: string | null, description: string): string {
  const preferred = vulnerabilityName?.trim() || title?.trim() || description.trim();
  return preferred.length > 0 ? preferred : "Unnamed vulnerability";
}

function buildProductSummary(
  product: string | undefined,
  vendorProject: string | undefined,
  shortDescription: string | undefined
): string {
  const parts: string[] = [];
  
  if (vendorProject?.trim()) {
    parts.push(vendorProject.trim());
  }
  
  if (product?.trim() && product.trim() !== vendorProject?.trim()) {
    parts.push(product.trim());
  }
  
  if (parts.length === 0 && shortDescription?.trim()) {
    const desc = shortDescription.trim();
    return desc.length > 100 ? desc.substring(0, 97) + "..." : desc;
  }
  
  return parts.length > 0 ? parts.join(" - ") : "Unknown Product";
}

interface EpssData {
  epss: number;
  percentile: number;
}

async function fetchEpssBatch(cveIds: string[]): Promise<Map<string, EpssData>> {
  const result = new Map<string, EpssData>();
  
  if (cveIds.length === 0) {
    return result;
  }

  try {
    const cveList = cveIds.join(",");
    const url = `${EPSS_API_URL}?cve=${cveList}`;
    
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`EPSS API returned ${response.status}, using defaults`);
      return result;
    }

    const payload = await response.json();
    
    if (payload?.data && Array.isArray(payload.data)) {
      for (const entry of payload.data) {
        if (entry.cve && typeof entry.epss === "string" && typeof entry.percentile === "string") {
          const epssScore = parseFloat(entry.epss);
          const percentile = parseFloat(entry.percentile) * 100; // Convert to 0-100 scale
          
          if (!isNaN(epssScore) && !isNaN(percentile)) {
            result.set(entry.cve.toUpperCase(), {
              epss: epssScore,
              percentile,
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn("EPSS batch fetch failed, using defaults:", error);
  }

  return result;
}

function computeTrendScore(
  cvssScore: number,
  epssPercentile: number,
  dateAddedMs: number
): number {
  const now = Date.now();
  const daysSinceKev = Math.floor((now - dateAddedMs) / (24 * 60 * 60 * 1000));
  
  let recencyScore = 0;
  if (daysSinceKev <= 7) {
    recencyScore = 100;
  } else if (daysSinceKev <= 30) {
    recencyScore = 70;
  } else if (daysSinceKev <= 90) {
    recencyScore = 40;
  } else {
    recencyScore = 10;
  }
  
  // Weighted formula: CVSS (35%), EPSS percentile (45%), Recency (20%)
  return (cvssScore * 10 * 0.35) + (epssPercentile * 0.45) + (recencyScore * 0.20);
}

function isTrendingCve(
  cvssScore: number,
  epssPercentile: number,
  dateAddedMs: number
): boolean {
  const now = Date.now();
  const daysSinceKevAdded = Math.floor((now - dateAddedMs) / (24 * 60 * 60 * 1000));
  
  // Mandatory KEV recency gate: must be added within last 90 days
  if (daysSinceKevAdded > 90) {
    return false;
  }
  
  // Must meet at least ONE of these trending criteria:
  // 1. High EPSS percentile (>= 85th percentile)
  // 2. Critical CVSS score (>= 9.0)
  // 3. Recently added to KEV (<= 21 days)
  const passesTrending =
    epssPercentile >= TRENDING_EPSS_PERCENTILE_THRESHOLD ||
    cvssScore >= TRENDING_CVSS_THRESHOLD ||
    daysSinceKevAdded <= TRENDING_KEV_RECENCY_DAYS;
  
  // Final rule: in KEV (implicit) AND passes trending AND within 90 days
  return passesTrending && daysSinceKevAdded <= 90;
}

function isRecentCve(cveId: string, dateAdded: string | undefined, cvssScore: number): boolean {
  const now = Date.now();
  const recentThreshold = now - (RECENT_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
  const dateAddedMs = parseDateToMs(dateAdded);
  
  // Always include if added in last 90 days
  if (dateAddedMs >= recentThreshold) {
    return true;
  }
  
  // Extract year from CVE ID (format: CVE-YYYY-NNNNN)
  const yearMatch = cveId.match(/CVE-(\d{4})-/);
  const cveYear = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  
  // Include if CVE is from 2025+ OR is a critical zero-day (CVSS >= 9.0)
  if (cveYear >= 2025 || cvssScore >= CRITICAL_ZERO_DAY_THRESHOLD) {
    return true;
  }
  
  return false;
}

async function fetchThreatActiveCriticalCves(): Promise<Omit<ThreatActiveCacheEntry, "expiresAt">> {
  const response = await fetch(CISA_KEV_URL, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CISA KEV feed (${response.status})`);
  }

  const payload = await response.json();
  const parsed = kevFeedSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid CISA KEV feed format");
  }

  // Step 1: Parse and sort by dateAdded DESCENDING (newest first)
  const allCandidates: RankedCandidate[] = parsed.data.vulnerabilities
    .filter((entry) => /^CVE-\d{4}-\d{4,}$/i.test(entry.cveID))
    .map((entry) => ({
      cveId: entry.cveID.toUpperCase(),
      vulnerabilityName: entry.vulnerabilityName,
      dateAdded: entry.dateAdded,
      knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse,
      product: entry.product,
      vendorProject: entry.vendorProject,
      shortDescription: entry.shortDescription,
    }))
    .sort((a, b) => {
      // Primary sort: dateAdded DESCENDING (newest first)
      return parseDateToMs(b.dateAdded) - parseDateToMs(a.dateAdded);
    });

  // Step 2: Fetch NVD details and EPSS data, filter by trending criteria
  const config = getCveSearchConfig();
  const nvdAdapter = new NvdAdapter({
    config: {
      ...config,
      timeouts: {
        ...config.timeouts,
        perSourceMs: Math.min(config.timeouts.perSourceMs, 4_000),
      },
      retries: {
        ...config.retries,
        maxRetries: 1,
      },
    },
  });

  const rankedItems: Array<ThreatActiveItem & { dateAddedMs: number }> = [];
  const seen = new Set<string>();
  let processedCount = 0;

  // Process in batches until we have enough candidates
  for (let index = 0; index < allCandidates.length && rankedItems.length < TOP_N_RESULTS * 3; index += BATCH_SIZE) {
    const batch = allCandidates.slice(index, index + BATCH_SIZE);
    const batchCveIds = batch.map((entry) => entry.cveId);

    // Fetch NVD details for batch
    const nvdResolved = await Promise.all(
      batch.map(async (entry) => {
        try {
          const detail = await nvdAdapter.getById(entry.cveId);
          if (!detail.cve || typeof detail.cve.cvss.baseScore !== "number") {
            return null;
          }

          return {
            cveId: entry.cveId,
            cvssScore: detail.cve.cvss.baseScore,
            title: detail.cve.title,
            description: detail.cve.description,
            entry,
          };
        } catch {
          return null;
        }
      }),
    );

    // Fetch EPSS data for batch
    const epssMap = await fetchEpssBatch(batchCveIds);

    // Combine NVD + EPSS and apply trending filter
    for (const nvdData of nvdResolved) {
      if (!nvdData || seen.has(nvdData.cveId)) {
        continue;
      }

      // Ensure EPSS defaults are always set (never undefined or null)
      const epssData = epssMap.get(nvdData.cveId);
      const epssScore = epssData?.epss ?? 0;
      const epssPercentile = epssData?.percentile ?? 0;
      const dateAddedMs = parseDateToMs(nvdData.entry.dateAdded);

      // Apply trending filter: must pass 90-day KEV recency gate and trending criteria
      if (!isTrendingCve(nvdData.cvssScore, epssPercentile, dateAddedMs)) {
        continue;
      }

      const trendScore = computeTrendScore(nvdData.cvssScore, epssPercentile, dateAddedMs);
      const productSummary = buildProductSummary(
        nvdData.entry.product,
        nvdData.entry.vendorProject,
        nvdData.entry.shortDescription
      );

      seen.add(nvdData.cveId);
      rankedItems.push({
        cveId: nvdData.cveId,
        name: pickName(nvdData.entry.vulnerabilityName, nvdData.title, nvdData.description),
        productSummary,
        cvssScore: nvdData.cvssScore,
        dateAdded: nvdData.entry.dateAdded || "Unknown",
        link: `https://nvd.nist.gov/vuln/detail/${nvdData.cveId}`,
        epssScore,
        epssPercentile,
        trendScore,
        dateAddedMs,
      });
    }

    processedCount += batch.length;

    // Early exit if we have enough high-quality results
    if (rankedItems.length >= TOP_N_RESULTS * 2) {
      break;
    }
  }

  // Step 3: Sort by trend score (highest first), then EPSS percentile, then CVSS
  rankedItems.sort((a, b) => {
    // Primary: Trend score DESCENDING
    const trendDiff = b.trendScore - a.trendScore;
    if (Math.abs(trendDiff) > 0.01) {
      return trendDiff;
    }
    // Secondary: EPSS percentile DESCENDING
    const epssDiff = b.epssPercentile - a.epssPercentile;
    if (Math.abs(epssDiff) > 0.01) {
      return epssDiff;
    }
    // Tertiary: CVSS score DESCENDING
    return b.cvssScore - a.cvssScore;
  });

  // Step 4: Take TOP 10
  const data: ThreatActiveItem[] = rankedItems.slice(0, TOP_N_RESULTS).map((item) => ({
    cveId: item.cveId,
    name: item.name,
    productSummary: item.productSummary,
    cvssScore: item.cvssScore,
    dateAdded: item.dateAdded,
    link: item.link,
    epssScore: item.epssScore,
    epssPercentile: item.epssPercentile,
    trendScore: item.trendScore,
  }));

  return {
    catalogVersion: parsed.data.catalogVersion ?? null,
    dateReleased: parsed.data.dateReleased ?? null,
    generatedAt: new Date().toISOString(),
    data,
    recentMatchCount: data.length,
  };
}

async function getThreatActiveCriticalCves(): Promise<ThreatActiveCacheEntry> {
  if (threatActiveCache && threatActiveCache.expiresAt > Date.now()) {
    return threatActiveCache;
  }

  const fresh = await fetchThreatActiveCriticalCves();
  threatActiveCache = {
    ...fresh,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return threatActiveCache;
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const result = await getThreatActiveCriticalCves();

    const displayTitle = result.data.length > 0
      ? `Top ${result.data.length} Trending Exploited CVEs`
      : "0 Active - No trending threat-active CVEs in results";

    return jsonResponse({
      meta: {
        source: "CISA_KEV",
        catalogVersion: result.catalogVersion,
        dateReleased: result.dateReleased,
        generatedAt: result.generatedAt,
        count: result.data.length,
        displayTitle,
        description: result.data.length > 0
          ? `Showing ${result.data.length} highest trending CISA KEV entries (ranked by EPSS, CVSS, and recency)`
          : "No trending threat-active CVEs found (requires high EPSS percentile, critical CVSS, or recent KEV addition)",
      },
      data: result.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEvent("error", "threat_active_route_failed", { requestId, message });
    return internalServerError(requestId);
  }
}
