import { NextResponse } from "next/server";
import { TotpServiceError } from "@/lib/security/totp-service";

export function jsonNoStore(payload: unknown, init?: ResponseInit): NextResponse {
    const response = NextResponse.json(payload, init);
    response.headers.set("Cache-Control", "no-store");
    return response;
}

export function handleTotpError(error: unknown, fallbackMessage: string): NextResponse {
    if (error instanceof TotpServiceError) {
        return jsonNoStore(
            { error: error.message, code: error.code },
            { status: error.status },
        );
    }

    console.error("TOTP route error:", error);
    return jsonNoStore(
        { error: fallbackMessage, code: "internal_error" },
        { status: 500 },
    );
}
