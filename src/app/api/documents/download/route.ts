import { prisma } from "@/lib/db";
import { requireUser, err } from "@/lib/api";
import { canAccessCase } from "@/lib/rbac";
import { getStorageDriver } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Authenticated document download: GET /api/documents/download?id=<documentId>
 * Enforces the same permission (documents:manage) and object-level case
 * access as the case itself, then streams the stored binary. Files are never
 * served from a public path.
 */
export async function GET(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return err("id is required");
  const doc = await prisma.caseDocument.findUnique({ where: { id }, include: { loanCase: { select: { ownerId: true } } } });
  if (!doc) return err("Document not found", 404);
  if (!canAccessCase(a.user, doc.loanCase)) return err("Forbidden", 403);
  if (!doc.fileUrl) return err("No file has been uploaded for this document", 404);
  let data: Buffer;
  try {
    data = await getStorageDriver().get(doc.fileUrl);
  } catch {
    return err("Stored file could not be read", 500);
  }
  const name = (doc.fileName || "document").replace(/"/g, "");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
