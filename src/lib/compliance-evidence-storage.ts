import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".txt", ".log", ".csv", ".json"]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/json",
  "application/octet-stream",
]);

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function assertEvidenceFileAllowed(fileName: string, mimeType: string, sizeBytes: number) {
  const extension = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported evidence file extension: ${extension || "(none)"}`);
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported evidence MIME type: ${mimeType}`);
  }

  if (sizeBytes > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    throw new Error(
      `Evidence file too large (${sizeBytes} bytes). Max allowed is ${MAX_EVIDENCE_FILE_SIZE_BYTES} bytes.`,
    );
  }
}

function getEvidenceBaseDir() {
  return path.join(process.cwd(), "data", "compliance-evidence");
}

function buildTimestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Prepares evidence content for storage.
 *
 * Returns the bytes alongside the metadata: the caller writes them to
 * `ComplianceEvidenceVersion.data` so the content lives in the database and any
 * replica can serve it. `storagePath` is kept as a stable logical identifier
 * for the version, not as a filesystem location.
 */
export async function writeEvidenceFile(options: {
  controlId: string;
  evidenceId: string;
  version: number;
  originalFileName: string;
  mimeType: string;
  data: Buffer;
}) {
  const safeName = sanitizeFileName(options.originalFileName || "evidence.bin");
  const relativePath = path
    .join(
      options.controlId,
      options.evidenceId,
      `v${options.version}_${buildTimestampSlug()}_${safeName}`,
    )
    .replace(/\\/g, "/");

  const checksum = crypto.createHash("sha256").update(options.data).digest("hex");

  return {
    storagePath: relativePath,
    sizeBytes: options.data.byteLength,
    checksum,
    mimeType: options.mimeType,
    // Prisma's Bytes field is Uint8Array<ArrayBuffer>; Buffer's backing store is
    // ArrayBufferLike, which does not satisfy it. Copy into an exact view.
    data: new Uint8Array(
      options.data.buffer.slice(
        options.data.byteOffset,
        options.data.byteOffset + options.data.byteLength,
      ) as ArrayBuffer,
    ),
  };
}

/**
 * Reads a version's content.
 *
 * Prefers the database column. Rows created before evidence moved into the
 * database still only have a file on one machine's disk, so those fall back to
 * reading it — with the traversal guard the old implementation had.
 */
export async function readEvidenceContent(version: {
  data?: Buffer | Uint8Array | null;
  storagePath: string;
}): Promise<Buffer> {
  if (version.data && version.data.byteLength > 0) {
    return Buffer.from(version.data);
  }

  const normalized = version.storagePath.replace(/^\/+/, "");
  const baseDir = path.resolve(getEvidenceBaseDir());
  const absolutePath = path.resolve(baseDir, normalized);

  // `startsWith` on the base alone would accept a sibling like `/data/evidence-x`.
  if (absolutePath !== baseDir && !absolutePath.startsWith(baseDir + path.sep)) {
    throw new Error("Invalid evidence file path");
  }

  try {
    return await fs.readFile(absolutePath);
  } catch {
    throw new Error(
      "Evidence content is unavailable. It predates database storage and is not present on this instance.",
    );
  }
}

export async function writeTextEvidenceFile(options: {
  controlId: string;
  evidenceId: string;
  version: number;
  fileName: string;
  text: string;
}) {
  const data = Buffer.from(options.text, "utf-8");
  assertEvidenceFileAllowed(options.fileName, "text/plain", data.byteLength);

  return writeEvidenceFile({
    controlId: options.controlId,
    evidenceId: options.evidenceId,
    version: options.version,
    originalFileName: options.fileName,
    mimeType: "text/plain",
    data,
  });
}

/**
 * No longer creates anything: content lives in the database. Retained as a
 * no-op so existing call sites keep working.
 */
export async function ensureEvidenceStorageExists() {
  // Intentionally empty.
}
