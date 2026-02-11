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

  return parsed.toString();
}
