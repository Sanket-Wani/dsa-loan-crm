import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { canAccessLead } from "@/lib/rbac";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("followups:manage"); if ("response" in a) return a.response;
  const sp = new URL(req.url).searchParams; const when = sp.get("when");
  const now = new Date();
  const where: Record<string, unknown> = {};
  if (when === "overdue") where.AND = [{ dueAt: { lt: now } }, { status: "PENDING" }];
  if (when === "upcoming") where.AND = [{ dueAt: { gte: now } }, { status: "PENDING" }];
  if (sp.get("leadId")) where.leadId = sp.get("leadId");
  if (sp.get("caseId")) where.caseId = sp.get("caseId");
  const items = await prisma.followUp.findMany({ where: where as never, orderBy: { dueAt: "asc" }, take: 100, include: { lead: true, loanCase: true } });
  const visible = items.filter((f: { lead: { assignedToId: string | null } | null }) => !f.lead || a.user.role === "SUPER_ADMIN" || a.user.role === "ADMIN" || canAccessLead(a.user, f.lead));
  return ok(visible);
}
const schema = z.object({ leadId: z.string().optional(), caseId: z.string().optional(), dueAt: z.string().datetime(), notes: z.string().optional(), status: z.enum(["PENDING","DONE","CANCELLED"]).optional() });
export async function POST(req: Request) {
  const a = await requireUser("followups:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success || (!p.data.leadId && !p.data.caseId)) return err("leadId or caseId and dueAt required");
  const fu = await prisma.followUp.create({ data: { leadId: p.data.leadId, caseId: p.data.caseId, dueAt: new Date(p.data.dueAt), notes: p.data.notes, status: p.data.status, createdById: a.user.id } });
  if (p.data.leadId) await prisma.lead.update({ where: { id: p.data.leadId }, data: { nextFollowUpAt: new Date(p.data.dueAt) } }).catch(() => null);
  return ok(fu, 201);
}
