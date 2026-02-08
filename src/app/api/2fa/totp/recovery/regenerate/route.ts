import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { regenerateRecoveryCodes } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";
import { isRecentAuthentication, isRecentTwoFactorVerification } from "@/lib/security/two-factor";

const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    if (
        !isRecentTwoFactorVerification(session, RECENT_AUTH_WINDOW_MS) &&
        !isRecentAuthentication(session, RECENT_AUTH_WINDOW_MS)
    ) {
        return jsonNoStore(
            {
                error: "Recent authentication is required to regenerate recovery codes.",
                code: "recent_auth_required",
            },
            { status: 403 },
        );
    }

    let body: { targetUserId?: string } = {};
    try {
        body = await request.json();
    } catch {
        // No body is valid; default to current user.
    }

    const targetUserId = body.targetUserId || session.user.id;
    if (targetUserId !== session.user.id && session.user.role !== "MAIN_OFFICER") {
        return jsonNoStore(
            { error: "MAIN_OFFICER role required to regenerate another user's recovery codes." },
            { status: 403 },
        );
    }

    try {
        const result = await regenerateRecoveryCodes({
            store: prismaTotpStore,
            userId: targetUserId,
        });

        return jsonNoStore({
            recoveryCodes: result.recoveryCodes,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        return handleTotpError(error, "Failed to regenerate recovery codes.");
    }
}
