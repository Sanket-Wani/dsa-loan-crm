import { prisma } from "@/lib/db";
import { requireUser, ok, err, pagination, audit } from "@/lib/api";
import { caseScope } from "@/lib/rbac";
import { formatCaseCode } from "@/lib/caseCode";
import { normalizePhone, normalizeEmail } from "@/lib/duplicates";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("cases:read"); if ("response" in a) return a.response;
  const { page, pageSize, skip, take, searchParams } = pagination(req);
  const where: Record<string, unknown> = { ...caseScope(a.user) };
  if (searchParams.get("stage")) where.stage = searchParams.get("stage");
  if (searchParams.get("status")) where.status = searchParams.get("status");
  const q = searchParams.get("q") || "";
  if (q) where.OR = [{ code: { contains: q } }, { customer: { name: { contains: q, mode: "insensitive" } } }];
  const [total, items] = await Promise.all([prisma.loanCase.count({ where: where as never }), prisma.loanCase.findMany({ where: where as never, skip, take, orderBy: { createdAt: "desc" }, include: { customer: true, product: true, owner: { select: { id: true, name: true, employeeCode: true } } } })]);
  return ok({ items, total, page, pageSize });
}
const schema = z.object({ leadId: z.string().optional(), customerId: z.string().optional(), productCode: z.string().optional(), requestedAmount: z.number().positive().optional(), ownerId: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("cases:create"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid case payload");
  let customerId = p.data.customerId, productCode = p.data.productCode, amount = p.data.requestedAmount;
  if (p.data.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: p.data.leadId } });
    if (!lead) return err("Lead not found", 404);
    if (lead.status !== "QUALIFIED" && a.user.role === "TELECALLER") return err("Only qualified leads can become loan cases", 422);
    // Reuse customer by normalized phone/email — dedupe.
    let customer = await prisma.customer.findUnique({ where: { normalizedPhone: lead.normalizedPhone } });
    if (!customer && lead.normalizedEmail) customer = await prisma.customer.findUnique({ where: { normalizedEmail: lead.normalizedEmail } });
    if (!customer) customer = await prisma.customer.create({ data: { name: lead.name, phone: lead.phone, normalizedPhone: normalizePhone(lead.phone), email: lead.email ?? undefined, normalizedEmail: normalizeEmail(lead.email), company: lead.company ?? undefined, city: lead.city ?? undefined } });
    customerId = customer.id; productCode = productCode || lead.productCode || undefined; amount = amount || lead.requestedAmount || undefined;
    await prisma.lead.update({ where: { id: lead.id }, data: { customerId: customer.id } });
  }
  if (!customerId) return err("customerId or leadId is required");
  const product = productCode ? await prisma.loanProduct.findUnique({ where: { code: productCode } }) : null;
  const count = await prisma.loanCase.count();
  const code = formatCaseCode(new Date(), count + 1);
  const loanCase = await prisma.loanCase.create({ data: { code, customerId, leadId: p.data.leadId, productId: product?.id, productCode: productCode, requestedAmount: amount, ownerId: p.data.ownerId || (a.user.role === "BACK_OFFICE" ? a.user.id : undefined) } });
  // Generate checklist from product requirements
  if (product) {
    const reqs = await prisma.documentRequirement.findMany({ where: { productId: product.id } });
    for (const r of reqs) await prisma.caseDocument.create({ data: { caseId: loanCase.id, requirementId: r.id, name: r.name, category: r.category, status: "REQUIRED" } });
  }
  await prisma.statusHistory.create({ data: { entity: "LoanCase", entityId: loanCase.id, caseId: loanCase.id, toStatus: "PRE_REVIEW", actorId: a.user.id } });
  await audit(a.user.id, "CASE_CREATE", "LoanCase", loanCase.id, { code });
  return ok(loanCase, 201);
}
