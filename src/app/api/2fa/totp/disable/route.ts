import { NextRequest } from "next/server";
import { auth, unstable_update } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { consumeRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { disableTotp } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";

const DISABLE_RATE_LIMIT_ATTEMPTS = 6;
const DISABLE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const rateLimit = consumeRateLimit(
        `totp:disable:${session.user.id}`,
        DISABLE_RATE_LIMIT_ATTEMPTS,
        DISABLE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
        return jsonNoStore(
            {
                error: "Too many disable attempts. Please try again later.",
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
        return jsonNoStore(
            { error: "Current TOTP code or recovery code is required to disable 2FA." },
            { status: 400 },
        );
    }

    try {
        const result = await disableTotp({
            store: prismaTotpStore,
            userId: session.user.id,
            code: body.code,
        });

        resetRateLimit(`totp:disable:${session.user.id}`);
        await unstable_update({
            twoFactorVerified: true,
            twoFactorVerifiedAt: Date.now(),
            user: { totpEnabled: false },
        });

        return jsonNoStore({
            success: true,
            disabled: result.disabled,
        });
    } catch (error) {
        return handleTotpError(error, "Failed to disable two-factor authentication.");
    }
}
