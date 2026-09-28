import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure invitation token
 * Minimum 32 bytes (256 bits) of entropy for banking-grade security
 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Calculate invitation expiration time
 * Default: 48 hours from now
 */
export function getInvitationExpiry(hoursFromNow: number = 48): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hoursFromNow);
  return expiry;
}

/**
 * Check if invitation is expired
 */
export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Check if invitation has been used
 */
export function isInvitationUsed(usedAt: Date | null): boolean {
  return usedAt !== null;
}

/**
 * Validate invitation token format
 */
export function isValidInvitationTokenFormat(token: string): boolean {
  // Base64url tokens should be at least 43 characters (32 bytes encoded)
  return typeof token === "string" && token.length >= 43 && /^[A-Za-z0-9_-]+$/.test(token);
}
