import type { VulnSource } from "@prisma/client";
import type { ScannerAdapter } from "@/lib/scanners/types";
import { nmapAdapter } from "@/lib/scanners/adapters/nmap";
import { trivyAdapter } from "@/lib/scanners/adapters/trivy";
import { openvasAdapter } from "@/lib/scanners/adapters/openvas";
import { nessusAdapter } from "@/lib/scanners/adapters/nessus";
import { qualysAdapter } from "@/lib/scanners/adapters/qualys";

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
};

export function getScannerAdapter(type: VulnSource): ScannerAdapter | null {
    return SCANNER_ADAPTERS[type] ?? null;
}

export interface ScannerDescriptor {
    type: VulnSource;
    label: string;
    execution: ScannerAdapter["execution"];
    binary?: string;
    targetHint: string;
    requires: ScannerAdapter["requires"];
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
