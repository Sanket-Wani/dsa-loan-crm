import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { canAccessLead } from "@/lib/rbac";
import { z } from "zod";
const schema = z.object({ leadId: z.string(), toUserId: z.string(), reason: z.string().optional(), notes: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("handovers:create"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("leadId and toUserId required");
  const lead = await prisma.lead.findUnique({ where: { id: p.data.leadId } }); if (!lead) return err("Lead not found", 404);
  // Telecallers can hand over their own leads; admins any lead.
  if (a.user.role === "TELECALLER" && !canAccessLead(a.user, lead)) return err("Forbidden", 403);
  const h = await prisma.handover.create({ data: { leadId: lead.id, fromUserId: lead.assignedToId, toUserId: p.data.toUserId, reason: p.data.reason, notes: p.data.notes } });
  await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId: p.data.toUserId, status: "HANDED_OVER" } });
  await prisma.leadAssignmentHistory.create({ data: { leadId: lead.id, fromUserId: lead.assignedToId, toUserId: p.data.toUserId, actorId: a.user.id, reason: p.data.reason || "Handover" } });
  await audit(a.user.id, "LEAD_HANDOVER", "Lead", lead.id, { toUserId: p.data.toUserId });
  return ok(h, 201);
}
export async function GET(req: Request) {
  const a = await requireUser("leads:read"); if ("response" in a) return a.response;
  const leadId = new URL(req.url).searchParams.get("leadId"); if (!leadId) return err("leadId required");
  return ok(await prisma.handover.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } }));
}
