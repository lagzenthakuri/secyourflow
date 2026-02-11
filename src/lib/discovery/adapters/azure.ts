import type { AssetDiscoveryAdapter, DiscoveredAssetRecord } from "@/lib/discovery/adapters/types";

export class AzureDiscoveryAdapter implements AssetDiscoveryAdapter {
  source = "azure";

  async listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]> {
    // Adapter contract ready for future live implementation.
    return [];
  }
}
