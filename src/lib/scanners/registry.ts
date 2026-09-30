import type { VulnSource } from "@prisma/client";
import { nessusAdapter } from "@/lib/scanners/adapters/nessus";
import { nmapAdapter } from "@/lib/scanners/adapters/nmap";
import { openvasAdapter } from "@/lib/scanners/adapters/openvas";
import { qualysAdapter } from "@/lib/scanners/adapters/qualys";
import { tenableAdapter } from "@/lib/scanners/adapters/tenable";
import { trivyAdapter } from "@/lib/scanners/adapters/trivy";
import type { ScannerAdapter } from "@/lib/scanners/types";

/**
 * Every scanner the run endpoint can dispatch to, keyed by the scanner type
 * stored on ScannerConfig.
 */
export const SCANNER_ADAPTERS: Partial<Record<VulnSource, ScannerAdapter>> = {
  NMAP: nmapAdapter,
  TRIVY: trivyAdapter,
  OPENVAS: openvasAdapter,
  NESSUS: nessusAdapter,
  QUALYS: qualysAdapter,
  TENABLE: tenableAdapter,
};

export function getScannerAdapter(type: VulnSource): ScannerAdapter | null {
  return SCANNER_ADAPTERS[type] ?? null;
}

export interface ScannerDescriptor {
  binary?: string;
  execution: ScannerAdapter["execution"];
  label: string;
  requires: ScannerAdapter["requires"];
  targetHint: string;
  type: VulnSource;
}

export function listScanners(): ScannerDescriptor[] {
  return Object.values(SCANNER_ADAPTERS)
    .filter((adapter): adapter is ScannerAdapter => Boolean(adapter))
    .map((adapter) => ({
      type: adapter.type,
      label: adapter.label,
      execution: adapter.execution,
      binary: adapter.binary,
      targetHint: adapter.targetHint,
      requires: adapter.requires,
    }));
}
