import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Document storage abstraction.
 *
 * Drivers:
 * - "local" (default): writes binaries to a PRIVATE directory on disk
 *   (STORAGE_DIR, default ./storage). This directory is outside `public/`,
 *   is git-ignored, and files are only ever served through the authenticated
 *   download endpoint (/api/documents/download), which enforces RBAC and
 *   object-level case access before streaming.
 * - "s3": S3-compatible object storage (AWS S3 / MinIO / R2 etc.). Configure
 *   with S3_BUCKET, S3_REGION, S3_ENDPOINT (optional, for S3-compatible
 *   providers), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY. The interface is
 *   implemented against the minimal subset below; wire an SDK (e.g.
 *   @aws-sdk/client-s3) in `s3Driver()` when deploying — until configured it
 *   throws a clear "not configured" error rather than silently falling back.
 *
 * Stored file names are always generated (UUID + extension from the validated
 * MIME type) and decoupled from the user-supplied original name, which is
 * kept only as metadata (CaseDocument.fileName). This prevents path
 * traversal, overwrite collisions and leaking original names in paths.
 */
export interface StoredFileMeta { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function validateUpload(meta: { mimeType: string; sizeBytes: number }): string | null {
  if (!ALLOWED_MIME_TYPES.includes(meta.mimeType)) return "Only PDF/JPEG/PNG/WebP files are allowed";
  if (meta.sizeBytes <= 0 || meta.sizeBytes > MAX_UPLOAD_BYTES) return "File size must be between 1 byte and 10 MB";
  return null;
}

/** Sanitise a user-supplied file name for display metadata (never used as a disk path). */
export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\]/g, "_").replace(/[^\w.\- ()]/g, "_").slice(0, 180) || "file";
}

/** File extension to use for a stored file, derived from the validated MIME type. */
export function extensionForMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? "";
}

/**
 * Generate the storage key for an upload. Pure and deterministic given the
 * unique id — production callers pass randomUUID(), tests pass a fixed id.
 * Keys are namespaced by case and document so a case's files group together
 * and re-uploads get a fresh key (the DB version counter tracks currency).
 */
export function makeStorageKey(caseId: string, documentId: string, mimeType: string, uniqueId: string = randomUUID()): string {
  return `${caseId}/${documentId}/${uniqueId}${extensionForMime(mimeType)}`;
}

/** Resolve a storage key to an absolute path INSIDE the local storage dir, rejecting traversal. */
export function resolveLocalPath(storageDir: string, storageKey: string): string {
  const root = path.resolve(storageDir);
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return resolved;
}

export interface StorageDriver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export function storageDir(): string {
  return process.env.STORAGE_DIR || process.env.UPLOAD_DIR || "./storage";
}

const localDriver: StorageDriver = {
  async put(key, data) {
    const filePath = resolveLocalPath(storageDir(), key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  },
  async get(key) {
    return fs.readFile(resolveLocalPath(storageDir(), key));
  },
};

/**
 * S3-compatible driver stub. Intentionally not wired to an SDK in this repo
 * (no credentials exist in dev/CI); it validates configuration and fails
 * loudly so a misconfigured production deployment can never silently drop
 * files. To enable: install @aws-sdk/client-s3, then implement put/get with
 * PutObjectCommand/GetObjectCommand using the env vars checked below, keeping
 * the bucket private and serving downloads only via the authenticated API.
 */
export function s3ConfigError(): string {
  const missing = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((k) => !process.env[k]);
  return `S3 storage driver is not configured (missing: ${missing.join(", ") || "SDK wiring"}). See docs/ARCHITECTURE.md.`;
}

const s3Driver: StorageDriver = {
  async put() { throw new Error(s3ConfigError()); },
  async get() { throw new Error(s3ConfigError()); },
};

export function getStorageDriver(): StorageDriver {
  return (process.env.STORAGE_DRIVER || "local") === "s3" ? s3Driver : localDriver;
}
