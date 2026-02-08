import { auth } from "@/lib/auth";
import { prismaTotpStore } from "@/lib/security/prisma-totp-store";
import { getTotpStatus } from "@/lib/security/totp-service";
import { handleTotpError, jsonNoStore } from "@/lib/security/totp-http";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const status = await getTotpStatus({
            store: prismaTotpStore,
            userId: session.user.id,
        });

        return jsonNoStore(status);
    } catch (error) {
        return handleTotpError(error, "Failed to load two-factor authentication status.");
    }
}
