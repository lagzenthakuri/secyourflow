import type { ThreatIntelConfig } from "../config";
import { fetchJsonWithRetry } from "../utils/http";

interface TaxiiDiscovery {
  api_roots?: string[];
  default?: string;
}

interface TaxiiObjectsResponse {
  objects?: unknown[];
  more?: boolean;
  next?: string;
}

export class MitreTaxiiClient {
  constructor(private readonly config: ThreatIntelConfig) {}

  private requestOptions() {
    return {
      timeoutMs: Math.max(this.config.ingestion.timeoutMs, 30_000),
      maxRetries: Math.max(this.config.ingestion.maxRetries, 6),
      baseBackoffMs: Math.max(this.config.ingestion.baseBackoffMs, 1_500),
    };
  }

  private async delayBetweenPages(): Promise<void> {
    const waitMs = Math.max(500, this.config.ingestion.baseBackoffMs);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  async discoverApiRoot(): Promise<string> {
    const requestOptions = this.requestOptions();
    const discovery = await fetchJsonWithRetry<TaxiiDiscovery>({
      url: this.config.mitre.taxiiDiscoveryUrl,
      headers: {
        Accept: "application/taxii+json;version=2.1",
      },
      timeoutMs: requestOptions.timeoutMs,
      maxRetries: requestOptions.maxRetries,
      baseBackoffMs: requestOptions.baseBackoffMs,
    });

    const explicitDefault = discovery.default;
    if (explicitDefault) {
      return explicitDefault;
    }

    const firstRoot = discovery.api_roots?.[0];
    if (!firstRoot) {
      throw new Error("MITRE TAXII discovery returned no API roots");
    }

    return firstRoot;
  }

  async fetchCollectionObjects(params: {
    collectionId: string;
    addedAfter: string | null;
    limit?: number;
  }): Promise<unknown[]> {
    const limit = params.limit ?? 500;
    const requestOptions = this.requestOptions();
    const apiRootPath = await this.discoverApiRoot();
    const discoveryUrl = new URL(this.config.mitre.taxiiDiscoveryUrl);
    const base = `${discoveryUrl.protocol}//${discoveryUrl.host}`;
    const apiRoot = `${base}${apiRootPath}`.replace(/\/$/, "");

    const records: unknown[] = [];
    let nextCursor: string | null = null;

    for (;;) {
      const url = new URL(`${apiRoot}/collections/${params.collectionId}/objects/`);
      url.searchParams.set("limit", String(limit));
      if (params.addedAfter) {
        url.searchParams.set("added_after", params.addedAfter);
      }
      if (nextCursor) {
        url.searchParams.set("next", nextCursor);
      }

      const response = await fetchJsonWithRetry<TaxiiObjectsResponse>({
        url: url.toString(),
        headers: {
          Accept: "application/taxii+json;version=2.1",
        },
        timeoutMs: requestOptions.timeoutMs,
        maxRetries: requestOptions.maxRetries,
        baseBackoffMs: requestOptions.baseBackoffMs,
      });

      records.push(...(response.objects ?? []));

      if (!response.more || !response.next) {
        break;
      }

      await this.delayBetweenPages();
      nextCursor = response.next;
    }

    return records;
  }
}
