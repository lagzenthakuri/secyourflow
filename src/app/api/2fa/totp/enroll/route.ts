import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { enrollTotp } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    try {
        const enrollment = await enrollTotp({
            store: prismaTotpStore,
            userId: session.user.id,
            issuer: process.env.TOTP_ISSUER || "SecYourFlow",
        });

        const qrCodeDataUrl = await QRCode.toDataURL(enrollment.otpauthUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 280,
        });

        return jsonNoStore({
            secret: enrollment.secret,
            otpauthUrl: enrollment.otpauthUrl,
            qrCodeDataUrl,
        });
    } catch (error) {
        return handleTotpError(error, "Failed to start TOTP enrollment.");
    }
}
