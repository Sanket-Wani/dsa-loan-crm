import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { canAccessCase } from "@/lib/rbac";
import { z } from "zod";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await requireUser("cases:read"); if ("response" in a) return a.response;
  const c = await prisma.loanCase.findUnique({ where: { id: params.id }, include: { customer: true, product: true, owner: true, documents: { orderBy: { createdAt: "asc" } }, eligibility: { orderBy: { createdAt: "desc" } }, bankApplications: { include: { bank: true, queries: true } }, tasks: true, statusHistory: { orderBy: { createdAt: "desc" } } } });
  if (!c) return err("Case not found", 404);
  if (!canAccessCase(a.user, c) && a.user.role === "TELECALLER") {
    // Telecallers may view cases originating from their leads
    const leadOk = c.leadId ? await prisma.lead.findFirst({ where: { id: c.leadId, assignedToId: a.user.id } }) : null;
    if (!leadOk) return err("Forbidden", 403);
  } else if (!canAccessCase(a.user, c) && a.user.role !== "TELECALLER") return err("Forbidden", 403);
  return ok(c);
}
const schema = z.object({ stage: z.enum(["PRE_REVIEW","DOCUMENT_COLLECTION","DOCUMENT_VERIFICATION","ELIGIBILITY","BANK_LOGIN","PD","LEGAL","VALUATION","CREDIT_ASSESSMENT","IN_PRINCIPLE_SANCTION","FINAL_SANCTION","PRE_DISBURSEMENT","DISBURSED","POST_SALES","CLOSED","REJECTED"]).optional(), status: z.enum(["OPEN","ON_HOLD","SANCTIONED","DISBURSED","CLOSED","REJECTED"]).optional(), remarks: z.string().nullable().optional(), sanctionedAmount: z.number().nonnegative().nullable().optional(), disbursedAmount: z.number().nonnegative().nullable().optional(), ownerId: z.string().nullable().optional() });
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireUser("cases:update"); if ("response" in a) return a.response;
  const existing = await prisma.loanCase.findUnique({ where: { id: params.id } }); if (!existing) return err("Case not found", 404);
  if (!canAccessCase(a.user, existing)) return err("Forbidden", 403);
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload");
  const updated = await prisma.loanCase.update({ where: { id: params.id }, data: p.data as never });
  if (p.data.stage && p.data.stage !== existing.stage) await prisma.statusHistory.create({ data: { entity: "LoanCase", entityId: existing.id, caseId: existing.id, fromStatus: existing.stage, toStatus: p.data.stage, actorId: a.user.id } });
  await audit(a.user.id, "CASE_UPDATE", "LoanCase", existing.id, p.data);
  return ok(updated);
}
