import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Document storage abstraction.
 *
 * Drivers:
 * - "local" (default): writes binaries to a PRIVATE directory on disk
 *   (STORAGE_DIR, default ./storage). This directory is outside `public/`,
 *   is git-ignored, and files are only ever served through the authenticated
 *   download endpoint (/api/documents/download), which enforces RBAC and
 *   object-level case access before streaming.
 * - "s3": S3-compatible object storage (AWS S3 / MinIO / R2 etc.), implemented
 *   with @aws-sdk/client-s3. Configure with S3_BUCKET, S3_REGION, S3_ENDPOINT
 *   (optional, for S3-compatible providers), S3_ACCESS_KEY_ID,
 *   S3_SECRET_ACCESS_KEY. If required configuration is missing the driver
 *   throws a clear "not configured" error rather than silently falling back
 *   to local disk. The bucket must stay private; files are only ever served
 *   through the authenticated download endpoint, exactly like the local
 *   driver.
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
 * S3-compatible driver (Milestone 3 — implemented with @aws-sdk/client-s3).
 * Validates configuration and fails loudly so a misconfigured production
 * deployment can never silently drop files or fall back to ephemeral local
 * disk. Safety properties mirror the local driver:
 * - keys are the generated storage keys from makeStorageKey(); traversal /
 *   malformed keys are rejected before any request is made;
 * - the bucket is addressed only by its configured name and is expected to
 *   be private — objects are never made public and downloads are proxied
 *   through the authenticated API endpoint, never via a direct/public URL;
 * - credentials come only from env vars, never from code or the database.
 */
export const S3_REQUIRED_ENV = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function s3MissingEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return S3_REQUIRED_ENV.filter((k) => !env[k]);
}

export function s3ConfigError(env: NodeJS.ProcessEnv = process.env): string {
  const missing = s3MissingEnv(env);
  return `S3 storage driver is not configured (missing: ${missing.join(", ") || "unknown"}). See docs/ARCHITECTURE.md.`;
}

/** Read + validate the S3 configuration from env vars, throwing a clear error when incomplete. */
export function getS3Config(env: NodeJS.ProcessEnv = process.env): S3Config {
  if (s3MissingEnv(env).length > 0) throw new Error(s3ConfigError(env));
  return {
    bucket: env.S3_BUCKET as string,
    region: env.S3_REGION as string,
    endpoint: env.S3_ENDPOINT || undefined,
    accessKeyId: env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
  };
}

/**
 * Reject storage keys that could escape the intended namespace, mirroring
 * resolveLocalPath() for the local driver. Generated keys are
 * `<caseId>/<documentId>/<uuid>.<ext>` — no empty, "." or ".." segments,
 * no leading slash, no backslashes.
 */
export function assertValidStorageKey(key: string): void {
  if (!key || key.includes("\\") || key.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }
}

/** Minimal structural type for the SDK client, so tests can inject a fake. */
export interface S3ClientLike {
  send(command: PutObjectCommand | GetObjectCommand): Promise<unknown>;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (body == null) return Buffer.alloc(0);
  const b = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
    transformToString?: () => Promise<string>;
  };
  if (typeof b.transformToByteArray === "function") return Buffer.from(await b.transformToByteArray());
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === "string") return Buffer.from(body);
  // Fall back to consuming it as an async iterable / readable stream.
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Create an S3 StorageDriver. With no arguments it builds a real S3Client
 * from the env configuration (lazily, on first use). Tests may inject a
 * fake `client` and/or an explicit `config` — no real S3 is contacted then.
 */
export function createS3Driver(client?: S3ClientLike, config?: S3Config): StorageDriver {
  let resolvedClient: S3ClientLike | undefined = client;
  let resolvedConfig: S3Config | undefined = config;
  const ensure = (): { client: S3ClientLike; cfg: S3Config } => {
    if (!resolvedConfig) resolvedConfig = getS3Config();
    if (!resolvedClient) {
      resolvedClient = new S3Client({
        region: resolvedConfig.region,
        endpoint: resolvedConfig.endpoint,
        credentials: {
          accessKeyId: resolvedConfig.accessKeyId,
          secretAccessKey: resolvedConfig.secretAccessKey,
        },
        // S3-compatible providers (MinIO/R2) typically need path-style URLs
        // when a custom endpoint is set; AWS itself works either way.
        forcePathStyle: Boolean(resolvedConfig.endpoint),
      }) as S3ClientLike;
    }
    return { client: resolvedClient, cfg: resolvedConfig };
  };
  return {
    async put(key, data) {
      assertValidStorageKey(key);
      const { client: c, cfg } = ensure();
      await c.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: data }));
    },
    async get(key) {
      assertValidStorageKey(key);
      const { client: c, cfg } = ensure();
      const res = (await c.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))) as { Body?: unknown };
      return bodyToBuffer(res?.Body);
    },
  };
}

let cachedS3Driver: StorageDriver | null = null;
const s3Driver: StorageDriver = {
  async put(key, data) {
    if (!cachedS3Driver) cachedS3Driver = createS3Driver();
    return cachedS3Driver.put(key, data);
  },
  async get(key) {
    if (!cachedS3Driver) cachedS3Driver = createS3Driver();
    return cachedS3Driver.get(key);
  },
};

export function getStorageDriver(): StorageDriver {
  return (process.env.STORAGE_DRIVER || "local") === "s3" ? s3Driver : localDriver;
}
