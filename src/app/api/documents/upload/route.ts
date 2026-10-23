import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { canAccessCase } from "@/lib/rbac";
import { validateUpload, makeStorageKey, sanitizeFileName, getStorageDriver } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Real binary upload for a case document (multipart/form-data):
 * fields: documentId, file.
 * Stores the binary via the storage driver under a generated key, records
 * metadata on the CaseDocument, marks it RECEIVED, and increments `version`
 * when a file already exists for the document (re-upload = new version,
 * stored under a fresh key; the previous file is retained on disk).
 */
export async function POST(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const form = await req.formData().catch(() => null);
  if (!form) return err("Expected multipart/form-data");
  const documentId = form.get("documentId");
  const file = form.get("file");
  if (typeof documentId !== "string" || !documentId) return err("documentId is required");
  if (!(file instanceof File)) return err("file is required");
  const mimeType = file.type || "application/octet-stream";
  const invalid = validateUpload({ mimeType, sizeBytes: file.size });
  if (invalid) return err(invalid, 422);
  const doc = await prisma.caseDocument.findUnique({ where: { id: documentId }, include: { loanCase: { select: { ownerId: true } } } });
  if (!doc) return err("Document not found", 404);
  if (!canAccessCase(a.user, doc.loanCase)) return err("Forbidden", 403);
  const data = Buffer.from(await file.arrayBuffer());
  const key = makeStorageKey(doc.caseId, doc.id, mimeType);
  try {
    await getStorageDriver().put(key, data);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Storage write failed", 500);
  }
  const isReupload = !!doc.fileName;
  const updated = await prisma.caseDocument.update({
    where: { id: doc.id },
    data: {
      fileName: sanitizeFileName(file.name), fileUrl: key, mimeType, sizeBytes: file.size,
      status: "RECEIVED", uploadedById: a.user.id, uploadedAt: new Date(),
      version: isReupload ? doc.version + 1 : doc.version,
    },
  });
  await audit(a.user.id, "DOCUMENT_UPLOAD", "CaseDocument", doc.id, { fileName: updated.fileName, sizeBytes: file.size, version: updated.version });
  return ok(updated, 201);
}
