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
const TOP_N_RESULTS = 10;
const RECENT_DAYS_THRESHOLD = 90;
const BATCH_SIZE = 15;
const CACHE_TTL_MS = 5 * 60_000;
const MIN_CVSS_SCORE = 7.0;
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

  // Step 2: Fetch NVD details and filter by recency + CVSS
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

  const rankedItems: Array<ThreatActiveItem & { cvss: number; dateAddedMs: number }> = [];
  const seen = new Set<string>();
  let processedCount = 0;

  // Process in batches until we have TOP_N_RESULTS or exhaust candidates
  for (let index = 0; index < allCandidates.length && rankedItems.length < TOP_N_RESULTS * 3; index += BATCH_SIZE) {
    const batch = allCandidates.slice(index, index + BATCH_SIZE);

    const resolved = await Promise.all(
      batch.map(async (entry) => {
        try {
          const detail = await nvdAdapter.getById(entry.cveId);
          if (!detail.cve || typeof detail.cve.cvss.baseScore !== "number") {
            return null;
          }

          const cvssScore = detail.cve.cvss.baseScore;

          // Filter: Must meet minimum CVSS OR be recent/critical
          if (cvssScore < MIN_CVSS_SCORE && !isRecentCve(entry.cveId, entry.dateAdded, cvssScore)) {
            return null;
          }

          // Filter: Must be recent (last 90 days) OR 2025+ OR critical zero-day
          if (!isRecentCve(entry.cveId, entry.dateAdded, cvssScore)) {
            return null;
          }

          const productSummary = buildProductSummary(
            entry.product,
            entry.vendorProject,
            entry.shortDescription
          );

          return {
            cveId: entry.cveId,
            name: pickName(entry.vulnerabilityName, detail.cve.title, detail.cve.description),
            productSummary,
            cvssScore,
            dateAdded: entry.dateAdded || "Unknown",
            link: `https://nvd.nist.gov/vuln/detail/${entry.cveId}`,
            cvss: cvssScore,
            dateAddedMs: parseDateToMs(entry.dateAdded),
          } satisfies ThreatActiveItem & { cvss: number; dateAddedMs: number };
        } catch {
          return null;
        }
      }),
    );

    for (const item of resolved) {
      if (!item || seen.has(item.cveId)) {
        continue;
      }

      seen.add(item.cveId);
      rankedItems.push(item);
    }

    processedCount += batch.length;

    // Early exit if we have enough high-quality results
    if (rankedItems.length >= TOP_N_RESULTS * 2) {
      break;
    }
  }

  // Step 3: Sort by severity (Critical/High CVSS first), then by dateAdded
  rankedItems.sort((a, b) => {
    // Primary: CVSS score DESCENDING (highest severity first)
    const cvssWeight = b.cvss - a.cvss;
    if (Math.abs(cvssWeight) > 0.1) {
      return cvssWeight;
    }
    // Secondary: dateAdded DESCENDING (newest first)
    return b.dateAddedMs - a.dateAddedMs;
  });

  // Step 4: Take TOP 10
  const data: ThreatActiveItem[] = rankedItems.slice(0, TOP_N_RESULTS).map((item) => ({
    cveId: item.cveId,
    name: item.name,
    productSummary: item.productSummary,
    cvssScore: item.cvssScore,
    dateAdded: item.dateAdded,
    link: item.link,
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
      ? `Top ${result.data.length} Actively Exploited CVEs`
      : "0 Active - No recent threat-active CVEs in results";

    return jsonResponse({
      meta: {
        source: "CISA_KEV",
        catalogVersion: result.catalogVersion,
        dateReleased: result.dateReleased,
        generatedAt: result.generatedAt,
        count: result.data.length,
        displayTitle,
        description: result.data.length > 0
          ? `Showing ${result.data.length} most recent CISA KEV entries (last ${RECENT_DAYS_THRESHOLD} days preferred, sorted by severity)`
          : "No recent threat-active CVEs found matching criteria (last 90 days, CVSS >= 7.0, or 2025+ critical)",
      },
      data: result.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logEvent("error", "threat_active_route_failed", { requestId, message });
    return internalServerError(requestId);
  }
}
