import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const caseId = new URL(req.url).searchParams.get("caseId"); if (!caseId) return err("caseId required");
  return ok(await prisma.caseDocument.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } }));
}
const createSchema = z.object({ caseId: z.string(), name: z.string().min(2), category: z.string().min(2), requirementId: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const p = createSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid document payload");
  return ok(await prisma.caseDocument.create({ data: p.data }), 201);
}
const patchSchema = z.object({ id: z.string(), status: z.enum(["REQUIRED","REQUESTED","RECEIVED","UNDER_VERIFICATION","VERIFIED","REJECTED","CORRECTION_REQUIRED","SUBMITTED_TO_BANK"]), rejectionReason: z.string().nullable().optional() });
export async function PATCH(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const p = patchSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload");
  if (p.data.status === "REJECTED" && !p.data.rejectionReason) return err("rejectionReason is required when rejecting a document");
  const doc = await prisma.caseDocument.update({ where: { id: p.data.id }, data: { status: p.data.status, rejectionReason: p.data.rejectionReason ?? undefined, reviewedById: a.user.id } });
  await audit(a.user.id, "DOCUMENT_STATUS", "CaseDocument", doc.id, { status: p.data.status });
  return ok(doc);
}
