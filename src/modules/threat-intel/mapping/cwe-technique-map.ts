/**
 * Curated deterministic mapping for CWE -> ATT&CK technique IDs.
 * This map is intentionally conservative to avoid over-linking.
 */
export const CWE_TO_ATTACK_TECHNIQUES: Record<string, string[]> = {
  "CWE-79": ["T1059", "T1189"],
  "CWE-89": ["T1190"],
  "CWE-22": ["T1006"],
  "CWE-352": ["T1189"],
  "CWE-287": ["T1078"],
  "CWE-306": ["T1078"],
  "CWE-269": ["T1068"],
  "CWE-862": ["T1068"],
  "CWE-416": ["T1203"],
  "CWE-502": ["T1190", "T1133"],
  "CWE-434": ["T1105"],
  "CWE-918": ["T1190"],
  "CWE-798": ["T1078"],
  "CWE-20": ["T1190"],
  "CWE-200": ["T1005", "T1552"],
  "CWE-400": ["T1499"],
  "CWE-125": ["T1005"],
};

export function lookupTechniquesByCwe(cwe: string | null | undefined): string[] {
  if (!cwe) {
    return [];
  }

  const normalized = cwe.toUpperCase().trim();
  return CWE_TO_ATTACK_TECHNIQUES[normalized] ?? [];
}
