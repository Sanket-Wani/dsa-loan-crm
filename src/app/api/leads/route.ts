import { prisma } from "@/lib/db";
import { requireUser, ok, err, pagination, audit } from "@/lib/api";
import { leadCreateSchema } from "@/lib/validation";
import { normalizePhone, normalizeEmail, findDuplicates } from "@/lib/duplicates";
import { leadScope } from "@/lib/rbac";
export async function GET(req: Request) {
  const a = await requireUser("leads:read"); if ("response" in a) return a.response;
  const { page, pageSize, skip, take, searchParams } = pagination(req);
  const q = searchParams.get("q") || "", status = searchParams.get("status"), assignedToId = searchParams.get("assignedToId"), source = searchParams.get("source");
  const where: Record<string, unknown> = { ...leadScope(a.user) };
  if (status) where.status = status;
  if (source) where.source = source;
  if (assignedToId && (a.user.role === "SUPER_ADMIN" || a.user.role === "ADMIN")) where.assignedToId = assignedToId === "unassigned" ? null : assignedToId;
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }];
  const sort = searchParams.get("sort") === "amount" ? { requestedAmount: "desc" as const } : { createdAt: "desc" as const };
  const [total, items] = await Promise.all([prisma.lead.count({ where: where as never }), prisma.lead.findMany({ where: where as never, skip, take, orderBy: sort, include: { assignedTo: { select: { id: true, name: true, employeeCode: true } }, product: true } })]);
  return ok({ items, total, page, pageSize });
}
export async function POST(req: Request) {
  const a = await requireUser("leads:create"); if ("response" in a) return a.response;
  const parsed = leadCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(parsed.error.issues.map((i) => i.message).join("; "));
  const d = parsed.data;
  const existing = await prisma.lead.findMany({ select: { phone: true, email: true } });
  const dup = findDuplicates({ phone: d.phone, email: d.email }, existing);
  const product = d.productCode ? await prisma.loanProduct.findUnique({ where: { code: d.productCode } }) : null;
  const lead = await prisma.lead.create({ data: {
    name: d.name, phone: d.phone, normalizedPhone: normalizePhone(d.phone), email: d.email ?? undefined, normalizedEmail: normalizeEmail(d.email),
    company: d.company ?? undefined, city: d.city ?? undefined, location: d.location ?? undefined, productId: product?.id, productCode: d.productCode ?? undefined,
    requestedAmount: d.requestedAmount ?? undefined, source: d.source, remarks: d.remarks ?? undefined,
    assignedToId: d.assignedToId ?? undefined, status: d.assignedToId ? "ASSIGNED" : "UNASSIGNED", createdById: a.user.id,
  }});
  if (d.assignedToId) await prisma.leadAssignmentHistory.create({ data: { leadId: lead.id, toUserId: d.assignedToId, actorId: a.user.id, reason: "Initial assignment" } });
  await audit(a.user.id, "LEAD_CREATE", "Lead", lead.id, { duplicateWarning: dup.length > 0 });
  return ok({ ...lead, duplicateWarning: dup.length ? "A lead with the same phone/email already exists" : null }, 201);
}
