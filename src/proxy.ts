import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_API_PREFIXES = [
    "/api/auth",
    "/api/health",
    "/api/webhooks/wazuh",
    // Explicit external automation routes that perform their own token auth.
    "/api/admin/ingest",
    "/api/admin/threat-intel/sync",
    "/api/compliance/assessments/run",
    "/api/compliance/monitor",
];

function isPublicApiPath(pathname: string): boolean {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default auth((request) => {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/api/") && !isPublicApiPath(pathname) && request.method !== "OPTIONS") {
        const hasSession = Boolean(request.auth?.user);

        if (!hasSession) {
            return NextResponse.json(
                { error: "Unauthorized. Sign in required." },
                { status: 401 },
            );
        }
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
        "/cves/:path*",
    ],
};
