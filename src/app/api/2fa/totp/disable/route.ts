import { NextRequest } from "next/server";
import { auth, unstable_update } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { disableTotp } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";
import { buildTrustedTwoFactorSessionUpdate } from "@/lib/security/two-factor-session";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    let body: { code?: string };
    try {
        body = await request.json();
    } catch {
        return jsonNoStore({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!body.code || typeof body.code !== "string") {
        return jsonNoStore({ error: "Authentication or recovery code is required to disable 2FA." }, { status: 400 });
    }

    try {
        await disableTotp({
            store: prismaTotpStore,
            userId: session.user.id,
            code: body.code,
        });

        await unstable_update(
            buildTrustedTwoFactorSessionUpdate({
                twoFactorVerified: false,
                twoFactorVerifiedAt: null,
                user: { totpEnabled: false },
            }),
        );

        return jsonNoStore({
            success: true,
            disabled: true,
        });
    } catch (error) {
        return handleTotpError(error, "Failed to disable two-factor authentication.");
    }
}
