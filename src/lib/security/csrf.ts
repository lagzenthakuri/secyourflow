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
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const inferredProto = host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
        ? "http"
        : "https";
    const proto = request.headers.get("x-forwarded-proto") ?? inferredProto;

    if (host) {
        allowedOrigins.add(`${proto}://${host}`);
    }

    const nextAuthUrl = normalizeOrigin(process.env.NEXTAUTH_URL ?? null);
    if (nextAuthUrl) {
        allowedOrigins.add(nextAuthUrl);
    }

    return allowedOrigins.has(requestOrigin);
}
