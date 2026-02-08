import { decryptTotpSecret, encryptTotpSecret } from "@/lib/crypto/totpSecret";
import {
    coerceRecoveryHashes,
    consumeRecoveryCode,
    generateRecoveryCodes,
    hashRecoveryCodes,
} from "@/lib/security/recovery-codes";
import { buildTotpOtpAuthUrl, generateTotpSecret, verifyTotpToken } from "@/lib/security/totp";

type TotpRecoveryHashes = string[] | null;

export interface TotpUserRecord {
    id: string;
    email: string;
    totpEnabled: boolean;
    totpSecretEnc: string | null;
    totpVerifiedAt: Date | null;
    totpRecoveryCodesHash: unknown;
    totpLastUsedStep: number | null;
}

export interface TotpUserUpdate {
    totpEnabled?: boolean;
    totpSecretEnc?: string | null;
    totpVerifiedAt?: Date | null;
    totpRecoveryCodesHash?: TotpRecoveryHashes;
    totpLastUsedStep?: number | null;
}

export interface TotpUserStore {
    getById(userId: string): Promise<TotpUserRecord | null>;
    updateById(userId: string, data: TotpUserUpdate): Promise<TotpUserRecord>;
}

export class TotpServiceError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(message: string, status: number, code: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

interface TotpContext {
    store: TotpUserStore;
    userId: string;
}

async function requireUser(context: TotpContext): Promise<TotpUserRecord> {
    const user = await context.store.getById(context.userId);
    if (!user) {
        throw new TotpServiceError("User not found.", 404, "user_not_found");
    }

    return user;
}

function getRecoveryHashes(value: unknown): string[] {
    return coerceRecoveryHashes(value);
}

export async function getTotpStatus(context: TotpContext): Promise<{
    enabled: boolean;
    verifiedAt: string | null;
    hasPendingEnrollment: boolean;
    recoveryCodesRemaining: number;
}> {
    const user = await requireUser(context);
    const recoveryHashes = getRecoveryHashes(user.totpRecoveryCodesHash);

    return {
        enabled: user.totpEnabled,
        verifiedAt: user.totpVerifiedAt ? user.totpVerifiedAt.toISOString() : null,
        hasPendingEnrollment: !user.totpEnabled && Boolean(user.totpSecretEnc),
        recoveryCodesRemaining: recoveryHashes.length,
    };
}

export async function enrollTotp(
    context: TotpContext & { issuer?: string },
): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await requireUser(context);

    if (user.totpEnabled) {
        throw new TotpServiceError("Two-factor authentication is already enabled.", 409, "already_enabled");
    }

    if (!user.email) {
        throw new TotpServiceError("User email is required for TOTP enrollment.", 400, "missing_email");
    }

    const secret = generateTotpSecret();
    const otpauthUrl = buildTotpOtpAuthUrl(secret, user.email, context.issuer ?? "SecYourFlow");

    await context.store.updateById(user.id, {
        totpEnabled: false,
        totpSecretEnc: encryptTotpSecret(secret),
        totpVerifiedAt: null,
        totpRecoveryCodesHash: null,
        totpLastUsedStep: null,
    });

    return { secret, otpauthUrl };
}

export async function verifyTotpEnrollment(
    context: TotpContext & { code: string; nowMs?: number },
): Promise<{ recoveryCodes: string[] }> {
    const user = await requireUser(context);

    if (!user.totpSecretEnc) {
        throw new TotpServiceError("No TOTP enrollment in progress.", 400, "missing_secret");
    }

    const secret = decryptTotpSecret(user.totpSecretEnc);
    const verification = verifyTotpToken(secret, context.code, user.totpLastUsedStep, context.nowMs);

    if (!verification.valid) {
        if (verification.reason === "replay") {
            throw new TotpServiceError("That code was already used. Wait for a new code.", 409, "replay_detected");
        }

        throw new TotpServiceError("Invalid authentication code.", 400, "invalid_code");
    }

    const recoveryCodes = generateRecoveryCodes(10);
    const recoveryHashes = hashRecoveryCodes(recoveryCodes);

    await context.store.updateById(user.id, {
        totpEnabled: true,
        totpVerifiedAt: new Date(context.nowMs ?? Date.now()),
        totpRecoveryCodesHash: recoveryHashes,
        totpLastUsedStep: verification.matchedStep,
    });

    return { recoveryCodes };
}

export async function challengeTotp(
    context: TotpContext & { code: string; nowMs?: number },
): Promise<{ usedRecoveryCode: boolean; recoveryCodesRemaining: number }> {
    const user = await requireUser(context);
    if (!user.totpEnabled || !user.totpSecretEnc) {
        throw new TotpServiceError("Two-factor authentication is not enabled.", 400, "not_enabled");
    }

    const secret = decryptTotpSecret(user.totpSecretEnc);
    const verification = verifyTotpToken(secret, context.code, user.totpLastUsedStep, context.nowMs);

    if (verification.valid) {
        await context.store.updateById(user.id, {
            totpLastUsedStep: verification.matchedStep,
        });

        const recoveryHashes = getRecoveryHashes(user.totpRecoveryCodesHash);
        return {
            usedRecoveryCode: false,
            recoveryCodesRemaining: recoveryHashes.length,
        };
    }

    if (verification.reason === "replay") {
        throw new TotpServiceError("That code was already used. Wait for the next code.", 409, "replay_detected");
    }

    const recoveryHashes = getRecoveryHashes(user.totpRecoveryCodesHash);
    const recoveryResult = consumeRecoveryCode(context.code, recoveryHashes);
    if (!recoveryResult.matched) {
        throw new TotpServiceError("Invalid authentication or recovery code.", 400, "invalid_code");
    }

    await context.store.updateById(user.id, {
        totpRecoveryCodesHash: recoveryResult.remainingHashes,
    });

    return {
        usedRecoveryCode: true,
        recoveryCodesRemaining: recoveryResult.remainingHashes.length,
    };
}

export async function disableTotp(
    context: TotpContext & { code: string; nowMs?: number },
): Promise<{ disabled: boolean }> {
    const user = await requireUser(context);
    if (!user.totpEnabled) {
        return { disabled: false };
    }

    await challengeTotp(context);

    await context.store.updateById(user.id, {
        totpEnabled: false,
        totpSecretEnc: null,
        totpVerifiedAt: null,
        totpRecoveryCodesHash: null,
        totpLastUsedStep: null,
    });

    return { disabled: true };
}

export async function regenerateRecoveryCodes(context: TotpContext): Promise<{ recoveryCodes: string[] }> {
    const user = await requireUser(context);
    if (!user.totpEnabled) {
        throw new TotpServiceError("Enable two-factor authentication before generating recovery codes.", 400, "not_enabled");
    }

    const recoveryCodes = generateRecoveryCodes(10);
    const recoveryHashes = hashRecoveryCodes(recoveryCodes);

    await context.store.updateById(user.id, {
        totpRecoveryCodesHash: recoveryHashes,
    });

    return { recoveryCodes };
}
