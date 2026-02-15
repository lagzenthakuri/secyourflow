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

  const absolutePath = path.join(getEvidenceBaseDir(), relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, options.data);

  const checksum = crypto.createHash("sha256").update(options.data).digest("hex");

  return {
    storagePath: relativePath,
    sizeBytes: options.data.byteLength,
    checksum,
    mimeType: options.mimeType,
  };
}

export async function readEvidenceFile(storagePath: string): Promise<Buffer> {
  const normalized = storagePath.replace(/^\/+/, "");
  const absolutePath = path.resolve(getEvidenceBaseDir(), normalized);
  const baseDir = path.resolve(getEvidenceBaseDir());

  if (!absolutePath.startsWith(baseDir)) {
    throw new Error("Invalid evidence file path");
  }

  return fs.readFile(absolutePath);
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

export async function ensureEvidenceStorageExists() {
  await fs.mkdir(getEvidenceBaseDir(), { recursive: true });
}
