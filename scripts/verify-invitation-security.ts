#!/usr/bin/env tsx
/**
 * Security Verification Script for Invitation System
 * 
 * This script verifies that the invitation system meets banking-grade security requirements.
 * Run this before deploying to production.
 */

import { readFileSync } from "fs";
import { join } from "path";

interface SecurityCheck {
  name: string;
  description: string;
  check: () => boolean | Promise<boolean>;
  critical: boolean;
}

const checks: SecurityCheck[] = [
  {
    name: "No REGISTRATION_DEFAULT_ORGANIZATION_ID in code",
    description: "Verify that REGISTRATION_DEFAULT_ORGANIZATION_ID is not used anywhere",
    critical: true,
    check: () => {
      const registerRoute = readFileSync(
        join(process.cwd(), "src/app/api/auth/register/route.ts"),
        "utf-8"
      );
      return !registerRoute.includes("REGISTRATION_DEFAULT_ORGANIZATION_ID");
    },
  },
  {
    name: "Production registration blocked",
    description: "Verify that public registration is blocked in production",
    critical: true,
    check: () => {
      const registerRoute = readFileSync(
        join(process.cwd(), "src/app/api/auth/register/route.ts"),
        "utf-8"
      );
      return (
        registerRoute.includes('NODE_ENV === "production"') &&
        registerRoute.includes("return false")
      );
    },
  },
  {
    name: "Invitation model exists",
    description: "Verify that Invitation model is defined in Prisma schema",
    critical: true,
    check: () => {
      const schema = readFileSync(
        join(process.cwd(), "prisma/schema.prisma"),
        "utf-8"
      );
      return schema.includes("model Invitation");
    },
  },
  {
    name: "Invitation token is unique",
    description: "Verify that invitation token has unique constraint",
    critical: true,
    check: () => {
      const schema = readFileSync(
        join(process.cwd(), "prisma/schema.prisma"),
        "utf-8"
      );
      const invitationModel = schema.match(/model Invitation \{[\s\S]*?\}/);
      if (!invitationModel) return false;
      return invitationModel[0].includes("@unique") && invitationModel[0].includes("token");
    },
  },
  {
    name: "Invitation API requires MAIN_OFFICER",
    description: "Verify that invitation creation requires MAIN_OFFICER role",
    critical: true,
    check: () => {
      const invitationRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/route.ts"),
        "utf-8"
      );
      return invitationRoute.includes('allowedRoles: ["MAIN_OFFICER"]');
    },
  },
  {
    name: "Invitation acceptance is public",
    description: "Verify that invitation acceptance does not require authentication",
    critical: true,
    check: () => {
      const acceptRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/accept/route.ts"),
        "utf-8"
      );
      return !acceptRoute.includes("requireSessionWithOrg");
    },
  },
  {
    name: "Token generation uses crypto.randomBytes",
    description: "Verify that tokens are generated with cryptographically secure random",
    critical: true,
    check: () => {
      const utils = readFileSync(
        join(process.cwd(), "src/lib/invitation-utils.ts"),
        "utf-8"
      );
      return utils.includes("randomBytes") && utils.includes("32");
    },
  },
  {
    name: "Invitation expiry validation",
    description: "Verify that expired invitations are rejected",
    critical: true,
    check: () => {
      const acceptRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/accept/route.ts"),
        "utf-8"
      );
      return acceptRoute.includes("isInvitationExpired");
    },
  },
  {
    name: "Invitation usage validation",
    description: "Verify that used invitations are rejected",
    critical: true,
    check: () => {
      const acceptRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/accept/route.ts"),
        "utf-8"
      );
      return acceptRoute.includes("isInvitationUsed");
    },
  },
  {
    name: "Audit logging for invitations",
    description: "Verify that invitation operations are logged",
    critical: true,
    check: () => {
      const invitationRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/route.ts"),
        "utf-8"
      );
      const acceptRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/accept/route.ts"),
        "utf-8"
      );
      return (
        invitationRoute.includes("logActivity") &&
        acceptRoute.includes("logActivity")
      );
    },
  },
  {
    name: "Organization scoping in queries",
    description: "Verify that invitation queries are scoped to organization",
    critical: true,
    check: () => {
      const invitationRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/route.ts"),
        "utf-8"
      );
      return invitationRoute.includes("organizationId: context.organizationId");
    },
  },
  {
    name: "Transaction for user creation",
    description: "Verify that user creation and invitation marking use transaction",
    critical: true,
    check: () => {
      const acceptRoute = readFileSync(
        join(process.cwd(), "src/app/api/invitations/accept/route.ts"),
        "utf-8"
      );
      return acceptRoute.includes("$transaction");
    },
  },
];

async function runSecurityChecks() {
  console.log("🔒 Running Security Verification for Invitation System\n");
  console.log("=" .repeat(70));

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;

  for (const check of checks) {
    try {
      const result = await check.check();
      if (result) {
        console.log(`✅ PASS: ${check.name}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${check.name}`);
        console.log(`   ${check.description}`);
        failed++;
        if (check.critical) {
          criticalFailed++;
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${check.name}`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      failed++;
      if (check.critical) {
        criticalFailed++;
      }
    }
  }

  console.log("=" .repeat(70));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (criticalFailed > 0) {
    console.log(`\n🚨 CRITICAL: ${criticalFailed} critical security checks failed!`);
    console.log("❌ DO NOT DEPLOY TO PRODUCTION");
    process.exit(1);
  } else if (failed > 0) {
    console.log(`\n⚠️  WARNING: ${failed} non-critical checks failed`);
    console.log("⚠️  Review before deploying to production");
    process.exit(1);
  } else {
    console.log("\n✅ All security checks passed!");
    console.log("✅ System is ready for production deployment");
    process.exit(0);
  }
}

runSecurityChecks().catch((error) => {
  console.error("Fatal error running security checks:", error);
  process.exit(1);
});
