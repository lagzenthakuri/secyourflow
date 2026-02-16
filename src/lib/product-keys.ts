import { createHash, randomBytes } from "node:crypto";

export const PRODUCT_KEY_ELIGIBLE_ROLES = ["ANALYST", "IT_OFFICER", "PENTESTER"] as const;
export type ProductKeyEligibleRole = (typeof PRODUCT_KEY_ELIGIBLE_ROLES)[number];

function chunk(value: string, size: number): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks;
}

export function hashProductKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim().toUpperCase()).digest("hex");
}

export function generateProductKeyCode(): string {
  const bytes = randomBytes(15).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const normalized = bytes.slice(0, 20).padEnd(20, "X");
  const parts = chunk(normalized, 4);
  return `SYF-${parts.join("-")}`;
}
