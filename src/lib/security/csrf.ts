import { NextResponse } from "next/server";

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

export function hasTrustedOrigin(request: Request): boolean {
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

function isMutatingMethod(method: string): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

function hasSessionCookie(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return /(__Secure-)?(next-auth|authjs)\.session-token=/.test(cookieHeader);
}

/**
 * Enforce same-origin checks only for cookie-authenticated mutating requests.
 * Token-authorized calls without session cookies are intentionally skipped.
 */
export function requireTrustedOriginForSessionMutation(request: Request): NextResponse | null {
  if (!isMutatingMethod(request.method.toUpperCase())) {
    return null;
  }

  if (!hasSessionCookie(request)) {
    return null;
  }

  if (hasTrustedOrigin(request)) {
    return null;
  }

  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}
