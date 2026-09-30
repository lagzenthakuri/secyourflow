import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { isProtectedAppRoute } from "@/lib/auth/protected-routes";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/webhooks/wazuh",
  // Accepting an invitation necessarily happens before the invitee has an
  // account, so it cannot require a session. The route validates the
  // single-use token itself.
  "/api/invitations/accept",
  // Explicit external automation routes that perform their own token auth.
  "/api/admin/ingest",
  "/api/admin/threat-intel/sync",
  "/api/compliance/assessments/run",
  "/api/compliance/monitor",
];

/**
 * Matches a public route exactly, or on a path-segment boundary.
 *
 * A bare `startsWith` let `/api/healthcheck-anything` and
 * `/api/admin/ingest-everything` slip past this gate.
 */
function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    if (
      !isPublicApiPath(pathname) &&
      request.method !== "OPTIONS" &&
      !request.auth?.user
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in required." },
        { status: 401 }
      );
    }
  } else if (isProtectedAppRoute(pathname) && !request.auth?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return null;
});

export const config = {
  matcher: [
    "/api/:path*",
    "/login",
    "/auth/2fa",
    "/dashboard/:path*",
    "/vulnerabilities/:path*",
    "/assets/:path*",
    "/threats/:path*",
    "/compliance/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/scanners/:path*",
    "/risk-register/:path*",
    "/risk-appetite/:path*",
    "/cves/:path*",
    "/nis2/:path*",
    "/licensing/:path*",
    "/policies/:path*",
    "/vendors/:path*",
    "/data/:path*",
  ],
};
