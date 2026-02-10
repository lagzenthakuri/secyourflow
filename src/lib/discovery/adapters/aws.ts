import type { AssetDiscoveryAdapter, DiscoveredAssetRecord } from "@/lib/discovery/adapters/types";

export class AwsDiscoveryAdapter implements AssetDiscoveryAdapter {
  source = "aws";

  async listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]> {
    // Adapter contract ready for future live implementation.
    return [];
  }
}
