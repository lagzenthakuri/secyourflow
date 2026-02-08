import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getTotpRecoveryHashKey } from "@/lib/crypto/totpSecret";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_LENGTH = 10;
const RECOVERY_CODE_GROUP_SIZE = 5;

function normalizeRecoveryCode(code: string): string {
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function generateRecoveryCode(): string {
    const bytes = randomBytes(RECOVERY_CODE_LENGTH);
    let raw = "";

    for (let i = 0; i < RECOVERY_CODE_LENGTH; i += 1) {
        raw += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    }

    return `${raw.slice(0, RECOVERY_CODE_GROUP_SIZE)}-${raw.slice(RECOVERY_CODE_GROUP_SIZE)}`;
}

export function generateRecoveryCodes(count = 10): string[] {
    return Array.from({ length: count }, () => generateRecoveryCode());
}

export function hashRecoveryCode(code: string): string {
    const hmac = createHmac("sha256", getTotpRecoveryHashKey());
    hmac.update(normalizeRecoveryCode(code), "utf8");
    return hmac.digest("hex");
}

export function hashRecoveryCodes(codes: string[]): string[] {
    return codes.map((code) => hashRecoveryCode(code));
}

function constantTimeHashEquals(leftHex: string, rightHex: string): boolean {
    if (leftHex.length !== rightHex.length) {
        return false;
    }

    const left = Buffer.from(leftHex, "hex");
    const right = Buffer.from(rightHex, "hex");

    if (left.length !== right.length || left.length === 0) {
        return false;
    }

    return timingSafeEqual(left, right);
}

export function coerceRecoveryHashes(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => /^[a-f0-9]{64}$/.test(entry));
}

export function consumeRecoveryCode(
    inputCode: string,
    hashes: string[],
): { matched: true; remainingHashes: string[] } | { matched: false } {
    const candidateHash = hashRecoveryCode(inputCode);
    let matchedIndex = -1;

    hashes.forEach((hash, index) => {
        if (constantTimeHashEquals(hash, candidateHash) && matchedIndex === -1) {
            matchedIndex = index;
        }
    });

    if (matchedIndex === -1) {
        return { matched: false };
    }

    const remaining = hashes.filter((_, index) => index !== matchedIndex);
    return { matched: true, remainingHashes: remaining };
}
