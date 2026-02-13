/**
 * Security Middleware for API Routes
 * Provides authentication, authorization, and multi-tenancy isolation
 */

import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: Role;
    organizationId: string;
  };
}

export interface AuthOptions {
  requireAuth?: boolean;
  require2FA?: boolean;
  allowedRoles?: string[];
  requireOrganization?: boolean;
}

type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
};

/**
 * Authenticate and authorize the request
 */
export async function authenticateRequest(
  _request: NextRequest,
  options: AuthOptions = {}
): Promise<{ user: AuthenticatedUser | null; error?: NextResponse }> {
  const {
    requireAuth = true,
    require2FA = true,
    allowedRoles = [],
    requireOrganization = true,
  } = options;

  if (!requireAuth) {
    return { user: null };
  }

  // Get session
  const session = await auth();

  if (!session?.user?.id) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized - Authentication required" }, { status: 401 }),
    };
  }

  // Check 2FA if required
  if (require2FA && !isTwoFactorSatisfied(session)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Two-factor authentication required" },
        { status: 403 }
      ),
    };
  }

  // Check role if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(session.user.role || "")) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  // Get user's organization
  let organizationId: string | null = null;
  if (requireOrganization) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return {
        user: null,
        error: NextResponse.json(
          { error: "User organization not found" },
          { status: 403 }
        ),
      };
    }

    organizationId = user.organizationId;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email || "",
      role: (session.user.role as Role | undefined) || Role.ANALYST,
      organizationId: organizationId || "",
    },
  };
}

/**
 * Verify resource belongs to user's organization
 */
export async function verifyResourceOwnership(
  resourceId: string,
  organizationId: string,
  resourceType: "asset" | "vulnerability" | "complianceControl" | "scanner"
): Promise<boolean> {
  try {
    let resource;

    switch (resourceType) {
      case "asset":
        resource = await prisma.asset.findFirst({
          where: { id: resourceId, organizationId },
          select: { id: true },
        });
        break;

      case "vulnerability":
        resource = await prisma.vulnerability.findFirst({
          where: { id: resourceId, organizationId },
          select: { id: true },
        });
        break;

      case "complianceControl":
        resource = await prisma.complianceControl.findFirst({
          where: {
            id: resourceId,
            framework: { organizationId },
          },
          select: { id: true },
        });
        break;

      case "scanner":
        resource = await prisma.scannerConfig.findFirst({
          where: { id: resourceId, organizationId },
          select: { id: true },
        });
        break;

      default:
        return false;
    }

    return !!resource;
  } catch (error) {
    console.error("Resource ownership verification error:", error);
    return false;
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;

  // Remove script tags and dangerous HTML
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers
    .replace(/javascript:/gi, "")
    .trim();
}

/**
 * Validate and sanitize object with allowed fields
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  data: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in data) {
      const key = field as keyof T;
      const value = data[key];
      if (typeof value === "string") {
        sanitized[key] = sanitizeInput(value) as T[keyof T];
      } else {
        sanitized[key] = value as T[keyof T];
      }
    }
  }

  return sanitized;
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
