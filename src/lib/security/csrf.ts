import { NextRequest } from "next/server";

function normalizeOrigin(value: string | null): string | null {
    if (!value) {
        return null;
    }

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

export function hasTrustedOrigin(request: NextRequest): boolean {
    const requestOrigin = normalizeOrigin(request.headers.get("origin"));
    if (!requestOrigin) {
        return false;
    }

    const allowedOrigins = new Set<string>();

    // Prefer trusted application origins over proxy-forwarded headers.
    allowedOrigins.add(request.nextUrl.origin);

    const nextAuthUrl = normalizeOrigin(process.env.NEXTAUTH_URL ?? null);
    if (nextAuthUrl) {
        allowedOrigins.add(nextAuthUrl);
    }

    const appBaseUrl = normalizeOrigin(process.env.APP_BASE_URL ?? null);
    if (appBaseUrl) {
        allowedOrigins.add(appBaseUrl);
    }

    return allowedOrigins.has(requestOrigin);
}
