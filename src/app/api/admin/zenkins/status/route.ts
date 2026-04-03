import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { requireSessionWithOrg } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authResult = await requireSessionWithOrg(request, { 
      allowedRoles: ["SUPER_ADMIN", "MAIN_OFFICER"] 
    });
    
    if (!authResult.ok) return authResult.response;

    const cwd = process.cwd();

    // 1. Get current branch
    let currentBranch = "main";
    try {
        currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd }).toString().trim();
    } catch (e) {
        console.error("Failed to get branch", e);
    }

    // 2. Fetch latest from origin
    try {
        execSync("git fetch origin", { cwd });
    } catch (e) {
        console.error("Git fetch origin failed", e);
    }

    // 3. Get local and remote hashes
    let localHash = "unknown";
    let remoteHash = "unknown";
    try {
        localHash = execSync(`git rev-parse HEAD`, { cwd }).toString().trim();
        remoteHash = execSync(`git rev-parse origin/${currentBranch}`, { cwd }).toString().trim();
    } catch (e) {
        console.error("Failed to get hashes", e);
    }

    const updateRequired = localHash !== remoteHash && remoteHash !== "unknown";
    let requiresRestart = false;

    if (updateRequired) {
      // Check for changes in critical files
      try {
        const diffFiles = execSync(`git diff --name-only ${localHash} origin/${currentBranch}`, { cwd }).toString().trim().split("\n");
        
        const criticalFiles = [
            "docker-compose.yml",
            "Dockerfile",
            "package.json",
            "prisma/schema.prisma",
            ".env.example",
            "next.config.ts",
            "next.config.js"
        ];

        requiresRestart = diffFiles.some(file => criticalFiles.some(cf => file.includes(cf)));
      } catch (e) {
        console.error("Diff failed", e);
      }
    }

    return NextResponse.json({
      branch: currentBranch,
      localHash: localHash.substring(0, 7),
      remoteHash: remoteHash.substring(0, 7),
      updateRequired,
      requiresRestart,
      status: "CONNECTED",
      lastCheck: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Zenkins status error:", error);
    return NextResponse.json({ 
        error: "Failed to reach orchestrator",
        details: error.message 
    }, { status: 500 });
  }
}
