import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ENVELOPE_VERSION = "v1";

function decodeKeyMaterial(rawKey: string): Buffer {
    const trimmed = rawKey.trim();
    const maybeBase64 = Buffer.from(trimmed, "base64");
    const base64RoundTrip = maybeBase64.toString("base64").replace(/=+$/, "");
    const normalizedInput = trimmed.replace(/=+$/, "");

    if (base64RoundTrip === normalizedInput && maybeBase64.length > 0) {
        return maybeBase64;
    }

    return Buffer.from(trimmed, "utf8");
}

function getKeyMaterial(): Buffer {
    const raw = process.env.TOTP_ENCRYPTION_KEY;

    if (!raw) {
        throw new Error("Missing TOTP_ENCRYPTION_KEY environment variable.");
    }

    const material = decodeKeyMaterial(raw);
    if (material.length < 32) {
        throw new Error("TOTP_ENCRYPTION_KEY must be at least 32 bytes (base64-encoded recommended).");
    }

    return material;
}

function deriveKey(context: string): Buffer {
    const material = getKeyMaterial();
    return createHash("sha256")
        .update(`secyourflow:${context}:v1`)
        .update(material)
        .digest();
}

function parseEnvelope(envelope: string): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
    const parts = envelope.split(".");
    if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
        throw new Error("Invalid encrypted TOTP secret format.");
    }

    const iv = Buffer.from(parts[1], "base64url");
    const authTag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");

    if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES || ciphertext.length === 0) {
        throw new Error("Invalid encrypted TOTP secret payload.");
    }

    return { iv, authTag, ciphertext };
}

export function assertTotpEncryptionKeyConfigured(): void {
    if (process.env.NODE_ENV === "production" && !process.env.TOTP_ENCRYPTION_KEY) {
        throw new Error("TOTP_ENCRYPTION_KEY is required in production.");
    }
}

export function encryptTotpSecret(secret: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const key = deriveKey("totp-secret");
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        ENVELOPE_VERSION,
        iv.toString("base64url"),
        authTag.toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}

export function decryptTotpSecret(encrypted: string): string {
    const { iv, authTag, ciphertext } = parseEnvelope(encrypted);
    const key = deriveKey("totp-secret");

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function getTotpRecoveryHashKey(): Buffer {
    return deriveKey("totp-recovery-code");
}
