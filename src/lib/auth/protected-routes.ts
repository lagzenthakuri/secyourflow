const PROTECTED_APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/vulnerabilities",
  "/assets",
  "/threats",
  "/compliance",
  "/reports",
  "/settings",
  "/users",
  "/scanners",
  "/risk-register",
  "/risk-appetite",
  "/cves",
  "/nis2",
  "/licensing",
  "/policies",
  "/vendors",
  "/data",
];

export function isProtectedAppRoute(pathname: string): boolean {
  return PROTECTED_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
