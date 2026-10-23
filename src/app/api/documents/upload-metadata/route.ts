import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { validateUpload, makeStorageKey } from "@/lib/storage";
import { z } from "zod";
const schema = z.object({ documentId: z.string(), fileName: z.string().min(1), mimeType: z.string(), sizeBytes: z.number().int().positive() });
export async function POST(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid upload metadata");
  const invalid = validateUpload(p.data); if (invalid) return err(invalid, 422);
  const doc = await prisma.caseDocument.findUnique({ where: { id: p.data.documentId } }); if (!doc) return err("Document not found", 404);
  // Metadata only: the binary is handled by the storage driver, never committed to git.
  const updated = await prisma.caseDocument.update({ where: { id: doc.id }, data: { fileName: p.data.fileName, fileUrl: makeStorageKey(doc.caseId, p.data.fileName), mimeType: p.data.mimeType, sizeBytes: p.data.sizeBytes, status: "RECEIVED", uploadedById: a.user.id, uploadedAt: new Date(), version: doc.version + (doc.fileName ? 1 : 0) } });
  await audit(a.user.id, "DOCUMENT_UPLOAD_META", "CaseDocument", doc.id, { fileName: p.data.fileName, sizeBytes: p.data.sizeBytes });
  return ok(updated);
}
