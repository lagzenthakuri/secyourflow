import type { Session } from "next-auth";

export const TWO_FACTOR_REVERIFY_INTERVAL_MS = 12 * 60 * 60 * 1000;

export function hasRecentTwoFactorVerification(
    twoFactorVerified: boolean,
    twoFactorVerifiedAt: number | null | undefined,
    maxAgeMs = TWO_FACTOR_REVERIFY_INTERVAL_MS,
    nowMs = Date.now(),
): boolean {
    if (!twoFactorVerified || typeof twoFactorVerifiedAt !== "number") {
        return false;
    }

    const verificationAgeMs = nowMs - twoFactorVerifiedAt;
    return verificationAgeMs >= 0 && verificationAgeMs <= maxAgeMs;
}

export function isTwoFactorSatisfied(
    session: Session | null | undefined,
    maxAgeMs = TWO_FACTOR_REVERIFY_INTERVAL_MS,
    nowMs = Date.now(),
): boolean {
    if (!session?.user) {
        return false;
    }

    // If 2FA is not enabled for this user, it is considered satisfied.
    if (!session.user.totpEnabled) {
        return true;
    }

    return hasRecentTwoFactorVerification(
        session.twoFactorVerified === true,
        session.twoFactorVerifiedAt,
        maxAgeMs,
        nowMs,
    );
}

export function isRecentTwoFactorVerification(
    session: Session | null | undefined,
    maxAgeMs: number,
    nowMs = Date.now(),
): boolean {
    if (!session?.user?.totpEnabled) {
        return false;
    }

    return hasRecentTwoFactorVerification(
        session.twoFactorVerified === true,
        session.twoFactorVerifiedAt,
        maxAgeMs,
        nowMs,
    );
}

export function isRecentAuthentication(
    session: Session | null | undefined,
    maxAgeMs: number,
    nowMs = Date.now(),
): boolean {
    if (!session || typeof session.authenticatedAt !== "number") {
        return false;
    }

    const authenticationAgeMs = nowMs - session.authenticatedAt;
    return authenticationAgeMs >= 0 && authenticationAgeMs <= maxAgeMs;
}
