import { NextRequest } from "next/server";
import { auth, unstable_update } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { consumeRateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { verifyTotpEnrollment } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";
import { buildTrustedTwoFactorSessionUpdate } from "@/lib/security/two-factor-session";

const VERIFY_RATE_LIMIT_ATTEMPTS = 6;
const VERIFY_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    const rateLimit = consumeRateLimit(
        `totp:verify:${session.user.id}`,
        VERIFY_RATE_LIMIT_ATTEMPTS,
        VERIFY_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateLimit.allowed) {
        return jsonNoStore(
            {
                error: "Too many verification attempts. Please try again later.",
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
        const result = await verifyTotpEnrollment({
            store: prismaTotpStore,
            userId: session.user.id,
            code: body.code,
        });

        resetRateLimit(`totp:verify:${session.user.id}`);
        await unstable_update(
            buildTrustedTwoFactorSessionUpdate({
                twoFactorVerified: true,
                twoFactorVerifiedAt: Date.now(),
                user: { totpEnabled: true },
            }),
        );

        return jsonNoStore({
            recoveryCodes: result.recoveryCodes,
        });
    } catch (error) {
        return handleTotpError(error, "Failed to verify and enable two-factor authentication.");
    }
}
