import { consumeRateLimit } from "@/lib/security/rate-limit";

const AUTH_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;

const AUTH_RATE_LIMIT_POLICIES = {
    credentials: {
        ipAttempts: 10,
        emailAttempts: 5,
    },
    registration: {
        ipAttempts: 10,
        emailAttempts: 3,
    },
} as const;

export type AuthRateLimitAction = keyof typeof AUTH_RATE_LIMIT_POLICIES;

export type AuthRateLimitDecision =
    | { allowed: true }
    | {
          allowed: false;
          retryAfterSeconds: number;
          scope: "ip" | "email";
      };

interface AuthRateLimitInput {
    ipAddress: string | null;
    email?: string | null;
}

/**
 * Applies both abuse limits used by public authentication endpoints. The
 * in-process fallback remains active when Redis is unavailable, so an outage
 * never removes brute-force protection or turns the endpoint into a 500.
 */
export async function consumeAuthRateLimit(
    action: AuthRateLimitAction,
    { ipAddress, email }: AuthRateLimitInput,
): Promise<AuthRateLimitDecision> {
    const policy = AUTH_RATE_LIMIT_POLICIES[action];
    const ipKey = ipAddress?.trim() || "unknown";
    const normalizedEmail = email?.trim().toLowerCase();

    const ipResult = await consumeRateLimit(
        `auth:${action}:ip:${ipKey}`,
        policy.ipAttempts,
        AUTH_RATE_LIMIT_WINDOW_MS,
    );

    if (!ipResult.allowed) {
        return {
            allowed: false,
            retryAfterSeconds: ipResult.retryAfterSeconds,
            scope: "ip",
        };
    }

    if (!normalizedEmail) {
        return { allowed: true };
    }

    const emailResult = await consumeRateLimit(
        `auth:${action}:email:${normalizedEmail}`,
        policy.emailAttempts,
        AUTH_RATE_LIMIT_WINDOW_MS,
    );

    if (!emailResult.allowed) {
        return {
            allowed: false,
            retryAfterSeconds: emailResult.retryAfterSeconds,
            scope: "email",
        };
    }

    return { allowed: true };
}
