import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";
const schema = z.object({ caseId: z.string() });
export async function POST(req: Request) {
  const a = await requireUser("documents:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("caseId required");
  const loanCase = await prisma.loanCase.findUnique({ where: { id: p.data.caseId } }); if (!loanCase) return err("Case not found", 404);
  if (!loanCase.productId) return ok({ created: 0, note: "Case has no product; no checklist to generate" });
  const reqs = await prisma.documentRequirement.findMany({ where: { productId: loanCase.productId } });
  let created = 0;
  for (const r of reqs) {
    const exists = await prisma.caseDocument.findFirst({ where: { caseId: loanCase.id, requirementId: r.id } });
    if (!exists) { await prisma.caseDocument.create({ data: { caseId: loanCase.id, requirementId: r.id, name: r.name, category: r.category } }); created++; }
  }
  return ok({ created });
}
