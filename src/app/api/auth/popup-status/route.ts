import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  return NextResponse.json(
    { authenticated: typeof token?.id === "string" && token.id.length > 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
