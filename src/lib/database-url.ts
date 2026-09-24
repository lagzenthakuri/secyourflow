const legacyAliasSslModes = new Set(["prefer", "require", "verify-ca"]);

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

  // pg-connection-string currently treats these values as aliases for
  // verify-full, but warns because that compatibility will be removed in the
  // next major version. Make the current, certificate-verifying behaviour
  // explicit. A URL that opts into libpq compatibility is left untouched so
  // providers that intentionally use require/prefer semantics still work.
  const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
  const useLibpqCompat = parsed.searchParams.get("uselibpqcompat")?.toLowerCase() === "true";
  if (sslMode && legacyAliasSslModes.has(sslMode) && !useLibpqCompat) {
    parsed.searchParams.set("sslmode", "verify-full");
  }

  return parsed.toString();
}
