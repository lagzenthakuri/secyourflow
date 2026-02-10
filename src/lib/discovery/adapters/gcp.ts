import type { AssetDiscoveryAdapter, DiscoveredAssetRecord } from "@/lib/discovery/adapters/types";

export class GcpDiscoveryAdapter implements AssetDiscoveryAdapter {
  source = "gcp";

  async listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]> {
    // Adapter contract ready for future live implementation.
    return [];
  }
}
