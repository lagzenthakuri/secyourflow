/**
 * Normalises DATABASE_URL for the pg pool.
 *
 * The previous version parsed the URL and re-serialised it unchanged — a no-op
 * dressed as normalisation. Connection sizing and TLS mode now actually get
 * applied, and can be tuned per deployment without editing the URL by hand.
 */
export function normalizeDatabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    throw new Error("DATABASE_URL must be set");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // Some deployments pass a libpq key=value DSN, which is not a URL. Leave
    // it alone rather than corrupting it.
    return rawUrl;
  }

  const applyIfAbsent = (key: string, value: string | undefined) => {
    if (value && !parsed.searchParams.has(key)) {
      parsed.searchParams.set(key, value);
    }
  };

  // Bound how many connections a single instance may open. Behind PgBouncer in
  // transaction mode this should be small and `pgbouncer=true` set.
  applyIfAbsent("connection_limit", process.env.DB_CONNECTION_LIMIT);
  applyIfAbsent("pool_timeout", process.env.DB_POOL_TIMEOUT_SECONDS);
  applyIfAbsent("sslmode", process.env.DB_SSL_MODE);

  if (process.env.DB_PGBOUNCER === "true") {
    applyIfAbsent("pgbouncer", "true");
  }

  return parsed.toString();
}
