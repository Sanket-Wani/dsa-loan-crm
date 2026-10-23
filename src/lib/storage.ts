/**
 * Storage abstraction. Local dev driver records metadata only in the DB and
 * (if a real file is later wired) writes under UPLOAD_DIR, which is git-ignored.
 * Production should plug S3/equivalent private storage here — files must never
 * be public or committed.
 */
export interface StoredFileMeta { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
export function validateUpload(meta: { mimeType: string; sizeBytes: number }): string | null {
  if (!ALLOWED.includes(meta.mimeType)) return "Only PDF/JPEG/PNG/WebP files are allowed";
  if (meta.sizeBytes <= 0 || meta.sizeBytes > MAX_BYTES) return "File size must be between 1 byte and 10 MB";
  return null;
}
export function makeStorageKey(caseId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${process.env.STORAGE_DRIVER || "local"}://${caseId}/${Date.now()}-${safe}`;
}
