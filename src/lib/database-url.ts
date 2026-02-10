const legacyAliasSslModes = new Set(["prefer", "require", "verify-ca"]);

export function normalizeDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error("DATABASE_URL must be set");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  const useLibpqCompat = parsed.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";

  if (sslMode && legacyAliasSslModes.has(sslMode) && !useLibpqCompat) {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}
