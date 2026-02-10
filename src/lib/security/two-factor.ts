import type { Session } from "next-auth";

export function isTwoFactorSatisfied(session: Session | null | undefined): boolean {
    if (!session?.user) {
        return false;
    }

    if (!session.user.totpEnabled) {
        return false;
    }

    return session.twoFactorVerified === true;
}

export function isRecentTwoFactorVerification(
    session: Session | null | undefined,
    maxAgeMs: number,
): boolean {
    if (!session?.user?.totpEnabled) {
        return false;
    }

    if (session.twoFactorVerified !== true || typeof session.twoFactorVerifiedAt !== "number") {
        return false;
    }

    return Date.now() - session.twoFactorVerifiedAt <= maxAgeMs;
}

export function isRecentAuthentication(
    session: Session | null | undefined,
    maxAgeMs: number,
): boolean {
    if (!session || typeof session.authenticatedAt !== "number") {
        return false;
    }

    return Date.now() - session.authenticatedAt <= maxAgeMs;
}
