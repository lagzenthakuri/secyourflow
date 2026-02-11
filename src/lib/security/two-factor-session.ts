interface TwoFactorSessionUpdatePayload {
    __twoFactorSessionUpdateKey?: string;
    twoFactorVerified?: boolean;
    twoFactorVerifiedAt?: number | null;
    authenticatedAt?: number;
    totpEnabled?: boolean;
    user?: {
        totpEnabled?: boolean;
    };
}

function getTwoFactorSessionUpdateKey(): string | null {
    const key =
        process.env.TWO_FACTOR_SESSION_UPDATE_KEY ||
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.TOTP_ENCRYPTION_KEY;

    if (!key) {
        return null;
    }

    return key;
}

export function assertTwoFactorSessionUpdateKeyConfigured(): void {
    if (!getTwoFactorSessionUpdateKey()) {
        throw new Error(
            "Missing two-factor session update key. Set TWO_FACTOR_SESSION_UPDATE_KEY, AUTH_SECRET, NEXTAUTH_SECRET, or TOTP_ENCRYPTION_KEY.",
        );
    }
}

export function buildTrustedTwoFactorSessionUpdate(
    payload: Omit<TwoFactorSessionUpdatePayload, "__twoFactorSessionUpdateKey">,
): TwoFactorSessionUpdatePayload {
    const updateKey = getTwoFactorSessionUpdateKey();
    if (!updateKey) {
        throw new Error(
            "Cannot build trusted two-factor session update without TWO_FACTOR_SESSION_UPDATE_KEY, AUTH_SECRET, NEXTAUTH_SECRET, or TOTP_ENCRYPTION_KEY.",
        );
    }

    return {
        ...payload,
        __twoFactorSessionUpdateKey: updateKey,
    };
}

export function isTrustedTwoFactorSessionUpdate(
    payload: unknown,
): payload is TwoFactorSessionUpdatePayload {
    const updateKey = getTwoFactorSessionUpdateKey();
    if (!updateKey || !payload || typeof payload !== "object") {
        return false;
    }

    const maybePayload = payload as TwoFactorSessionUpdatePayload;
    return maybePayload.__twoFactorSessionUpdateKey === updateKey;
}
