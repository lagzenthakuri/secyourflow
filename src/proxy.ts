import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health", "/api/webhooks"];

function isPublicApiPath(pathname: string): boolean {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasValidAuthorizationHeader(request: Request): boolean {
    const authorizationHeader = request.headers.get("authorization");
    if (!authorizationHeader) {
        return false;
    }

    const [scheme, token] = authorizationHeader.split(/\s+/, 2);
    return scheme === "Bearer" && typeof token === "string" && token.trim().length > 0;
}

export default auth((request) => {
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/api/") && !isPublicApiPath(pathname) && request.method !== "OPTIONS") {
        const hasApiToken = hasValidAuthorizationHeader(request);
        const hasSession = Boolean(request.auth?.user);

        if (!hasApiToken && !hasSession) {
            return NextResponse.json(
                { error: "Unauthorized. Sign in or use Authorization: Bearer <token>." },
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
