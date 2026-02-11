import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { extractRequestContext } from "@/lib/request-utils";

/**
 * POST /api/auth/audit-login
 * 
 * Logs user login events with IP address and user agent information.
 * This endpoint should be called from the client after successful authentication.
 * 
 * Security: Uses session-based authentication to prevent unauthorized logging.
 * Rate limiting: Client-side deduplication via sessionStorage prevents duplicate logs.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Only log if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ctx = extractRequestContext(request);
    
    // Log the login activity with request context
    await logActivity(
      "User login",
      "auth",
      session.user.email || session.user.id,
      null,
      null,
      "User logged in",
      session.user.id,
      ctx,
    );

    return NextResponse.json({ 
      success: true,
      message: "Login activity logged"
    });
  } catch (error) {
    console.error("Audit login error:", error);
    return NextResponse.json(
      { error: "Failed to log login activity" },
      { status: 500 }
    );
  }
}
