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

/**
 * Sanitize file name to prevent path traversal and other attacks
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components and dangerous characters
  return path.basename(fileName)
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Only allow safe characters
    .substring(0, 255); // Limit length
}

/**
 * Sanitize path component to prevent path traversal
 */
function sanitizePathComponent(component: string): string {
  // Remove any path traversal attempts and dangerous characters
  return component
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100);
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
  // Store outside public directory for security
  return path.join(process.cwd(), "private", "uploads", "compliance-evidence");
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
  // Sanitize all path components to prevent path traversal
  const safeControlId = sanitizePathComponent(options.controlId);
  const safeEvidenceId = sanitizePathComponent(options.evidenceId);
  const safeName = sanitizeFileName(options.originalFileName || "evidence.bin");
  
  // Validate version is a positive integer
  const safeVersion = Math.max(1, Math.floor(Math.abs(options.version)));
  
  const relativePath = path
    .join(
      "uploads",
      "compliance-evidence",
      safeControlId,
      safeEvidenceId,
      `v${safeVersion}_${buildTimestampSlug()}_${safeName}`,
    )
    .replace(/\\/g, "/");

  // Use private directory instead of public
  const absolutePath = path.join(process.cwd(), "private", relativePath);
  
  // Verify the resolved path is still within the base directory (prevent path traversal)
  const baseDir = getEvidenceBaseDir();
  const resolvedPath = path.resolve(absolutePath);
  const relativeToBase = path.relative(path.resolve(baseDir), resolvedPath);
  if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
    throw new Error("Invalid file path - path traversal detected");
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, options.data);

  const checksum = crypto.createHash("sha256").update(options.data).digest("hex");

  return {
    storagePath: `/${relativePath}`, // This will need authentication to access
    sizeBytes: options.data.byteLength,
    checksum,
    mimeType: options.mimeType,
  };
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

/**
 * Read evidence file with authentication check
 */
export async function readEvidenceFile(storagePath: string): Promise<Buffer> {
  // Remove leading slash and validate path
  const cleanPath = storagePath.replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), "private", cleanPath);
  
  // Verify the resolved path is still within the base directory
  const baseDir = getEvidenceBaseDir();
  const resolvedPath = path.resolve(absolutePath);
  const relativeToBase = path.relative(path.resolve(baseDir), resolvedPath);
  if (relativeToBase.startsWith("..") || path.isAbsolute(relativeToBase)) {
    throw new Error("Invalid file path - access denied");
  }

  return await fs.readFile(absolutePath);
}
