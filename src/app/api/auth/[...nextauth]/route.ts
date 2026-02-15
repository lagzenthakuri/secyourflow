import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { extractRequestContext } from "@/lib/request-utils";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const LOGIN_RATE_LIMIT_IP_ATTEMPTS = 10;
const LOGIN_RATE_LIMIT_IP_WINDOW_MS = 10 * 60 * 1000;

const LOGIN_RATE_LIMIT_EMAIL_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_EMAIL_WINDOW_MS = 10 * 60 * 1000;

export const GET = handlers.GET;

function isCredentialsCallback(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return pathname === "/api/auth/callback/credentials";
}

async function extractEmailFromCredentialsCallback(request: NextRequest): Promise<string | null> {
  const cloned = request.clone();
  const contentType = cloned.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await cloned.text();
      const params = new URLSearchParams(text);
      const raw = params.get("email");
      if (!raw) return null;
      const email = raw.trim().toLowerCase();
      return email.length > 0 ? email : null;
    }

    if (contentType.includes("application/json")) {
      const json = (await cloned.json()) as unknown;
      if (!json || typeof json !== "object") return null;
      const raw = (json as Record<string, unknown>).email;
      if (typeof raw !== "string") return null;
      const email = raw.trim().toLowerCase();
      return email.length > 0 ? email : null;
    }
  } catch {
    // ignore parse errors; fall back to IP-only rate limiting
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!isCredentialsCallback(request)) {
    return handlers.POST(request);
  }

  const ctx = extractRequestContext(request);
  const ip = ctx.ipAddress ?? "unknown";

  const ipBucket = consumeRateLimit(
    `auth:credentials:ip:${ip}`,
    LOGIN_RATE_LIMIT_IP_ATTEMPTS,
    LOGIN_RATE_LIMIT_IP_WINDOW_MS,
  );

  const email = await extractEmailFromCredentialsCallback(request);
  const emailBucket = email
    ? consumeRateLimit(
        `auth:credentials:email:${email}`,
        LOGIN_RATE_LIMIT_EMAIL_ATTEMPTS,
        LOGIN_RATE_LIMIT_EMAIL_WINDOW_MS,
      )
    : null;

  if (!ipBucket.allowed || (emailBucket && !emailBucket.allowed)) {
    const retryAfterSeconds = !ipBucket.allowed
      ? ipBucket.retryAfterSeconds
      : emailBucket && !emailBucket.allowed
        ? emailBucket.retryAfterSeconds
        : 60;

    const response = NextResponse.json(
      {
        error: "Too many authentication attempts. Please try again later.",
        retryAfterSeconds,
      },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return handlers.POST(request);
}
