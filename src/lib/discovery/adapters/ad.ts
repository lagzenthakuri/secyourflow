import type { AssetDiscoveryAdapter, DiscoveredAssetRecord } from "@/lib/discovery/adapters/types";

export class ActiveDirectoryDiscoveryAdapter implements AssetDiscoveryAdapter {
  source = "active-directory";

  async listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]> {
    // Adapter contract ready for future live implementation.
    return [];
  }
}
