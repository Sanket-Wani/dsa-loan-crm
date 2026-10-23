import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { canAccessLead } from "@/lib/rbac";
import { z } from "zod";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await requireUser("leads:read"); if ("response" in a) return a.response;
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, include: { assignedTo: true, product: true, calls: { orderBy: { calledAt: "desc" } }, followUps: { orderBy: { dueAt: "asc" } }, meetings: true, handovers: true, history: { orderBy: { createdAt: "desc" } } } });
  if (!lead) return err("Lead not found", 404);
  if (!canAccessLead(a.user, lead)) return err("Forbidden", 403);
  return ok(lead);
}
const patchSchema = z.object({ name: z.string().min(2).optional(), status: z.enum(["NEW","UNASSIGNED","ASSIGNED","CONTACTED","FOLLOW_UP_REQUIRED","INTERESTED","QUALIFIED","MEETING_SCHEDULED","HANDED_OVER","NOT_INTERESTED","UNREACHABLE","DISQUALIFIED"]).optional(), remarks: z.string().nullable().optional(), qualificationNotes: z.string().nullable().optional(), nextFollowUpAt: z.string().datetime().nullable().optional(), requestedAmount: z.number().positive().nullable().optional(), company: z.string().nullable().optional(), city: z.string().nullable().optional() });
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireUser("leads:update"); if ("response" in a) return a.response;
  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return err("Lead not found", 404);
  if (!canAccessLead(a.user, lead)) return err("Forbidden", 403);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid payload");
  const data = { ...parsed.data, nextFollowUpAt: parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : parsed.data.nextFollowUpAt };
  const updated = await prisma.lead.update({ where: { id: params.id }, data: data as never });
  if (parsed.data.status && parsed.data.status !== lead.status) await prisma.statusHistory.create({ data: { entity: "Lead", entityId: lead.id, leadId: lead.id, fromStatus: lead.status, toStatus: parsed.data.status, actorId: a.user.id } });
  await audit(a.user.id, "LEAD_UPDATE", "Lead", lead.id, parsed.data);
  return ok(updated);
}
