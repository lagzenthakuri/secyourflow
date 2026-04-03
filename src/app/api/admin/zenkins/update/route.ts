import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { requireSessionWithOrg } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authResult = await requireSessionWithOrg(request, { 
      allowedRoles: ["SUPER_ADMIN", "MAIN_OFFICER"] 
    });
    
    if (!authResult.ok) return authResult.response;

    const cwd = process.cwd();

    // 1. Get current branch
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd }).toString().trim();

    // 2. Perform pull
    const output = execSync(`git pull origin ${currentBranch}`, { cwd }).toString();

    // 3. Return success
    return NextResponse.json({
        message: "Update applied successfully",
        branch: currentBranch,
        stdout: output,
        timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Zenkins update error:", error);
    return NextResponse.json({ 
        error: "Update orchestration failed",
        details: error.message 
    }, { status: 500 });
  }
}
