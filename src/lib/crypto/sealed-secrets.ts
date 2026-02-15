import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ENVELOPE_VERSION = "secv1";

function getSecretKeyMaterial(): Buffer {
    const raw =
        process.env.CREDENTIAL_ENCRYPTION_KEY ||
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.TOTP_ENCRYPTION_KEY;

    if (!raw) {
        throw new Error(
            "Missing credential encryption key. Set CREDENTIAL_ENCRYPTION_KEY (recommended) or AUTH_SECRET/NEXTAUTH_SECRET.",
        );
    }

    return createHash("sha256").update(raw).digest();
}

function parseEnvelope(envelope: string): { iv: Buffer; authTag: Buffer; ciphertext: Buffer } {
    const parts = envelope.split(".");
    if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
        throw new Error("Invalid encrypted credential format.");
    }

    const iv = Buffer.from(parts[1], "base64url");
    const authTag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");

    if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES || ciphertext.length === 0) {
        throw new Error("Invalid encrypted credential payload.");
    }

    return { iv, authTag, ciphertext };
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
    return typeof value === "string" && value.startsWith(`${ENVELOPE_VERSION}.`);
}

export function encryptSecret(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (isEncryptedSecret(value)) {
        return value;
    }

    const iv = randomBytes(IV_LENGTH_BYTES);
    const key = getSecretKeyMaterial();
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        ENVELOPE_VERSION,
        iv.toString("base64url"),
        authTag.toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}

export function decryptSecret(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (!isEncryptedSecret(value)) {
        return value;
    }

    const { iv, authTag, ciphertext } = parseEnvelope(value);
    const key = getSecretKeyMaterial();
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function redactSecret(value: string | null | undefined): string | null {
    if (!value) return null;
    return "********";
}
