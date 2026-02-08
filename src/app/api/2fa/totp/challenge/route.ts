import { NextRequest } from "next/server";
import { auth, unstable_update } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { consumeRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { TotpServiceError, challengeTotp } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";

const CHALLENGE_RATE_LIMIT_ATTEMPTS = 8;
const CHALLENGE_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    if (!session.user.totpEnabled) {
        await unstable_update({
            twoFactorVerified: true,
            twoFactorVerifiedAt: Date.now(),
            user: { totpEnabled: false },
        });

        return jsonNoStore({ success: true, twoFactorVerified: true });
    }

    const rateLimit = consumeRateLimit(
        `totp:challenge:${session.user.id}`,
        CHALLENGE_RATE_LIMIT_ATTEMPTS,
        CHALLENGE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
        return jsonNoStore(
            {
                error: "Too many authentication attempts. Please try again later.",
                retryAfterSeconds: rateLimit.retryAfterSeconds,
            },
            { status: 429 },
        );
    }

    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        return jsonNoStore({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!body.code || typeof body.code !== "string") {
        return jsonNoStore({ error: "Authentication code is required." }, { status: 400 });
    }

    try {
        const result = await challengeTotp({
            store: prismaTotpStore,
            userId: session.user.id,
            code: body.code,
        });

        resetRateLimit(`totp:challenge:${session.user.id}`);
        await unstable_update({
            twoFactorVerified: true,
            twoFactorVerifiedAt: Date.now(),
            user: { totpEnabled: true },
        });

        return jsonNoStore({
            success: true,
            twoFactorVerified: true,
            usedRecoveryCode: result.usedRecoveryCode,
            recoveryCodesRemaining: result.recoveryCodesRemaining,
        });
    } catch (error) {
        if (error instanceof TotpServiceError && error.code === "not_enabled") {
            await unstable_update({
                twoFactorVerified: true,
                twoFactorVerifiedAt: Date.now(),
                user: { totpEnabled: false },
            });

            return jsonNoStore({ success: true, twoFactorVerified: true });
        }

        return handleTotpError(error, "Failed to verify the second authentication factor.");
    }
}
