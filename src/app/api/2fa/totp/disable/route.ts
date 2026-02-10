import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/security/csrf";
import { jsonNoStore } from "@/lib/security/totp-http";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasTrustedOrigin(request)) {
        return jsonNoStore({ error: "Invalid origin" }, { status: 403 });
    }

    return jsonNoStore(
        {
            error: "Two-factor authentication is mandatory and cannot be disabled.",
            code: "mandatory_two_factor",
        },
        { status: 403 },
    );
}
