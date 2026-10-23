import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { z } from "zod";
const schema = z.object({ leadIds: z.array(z.string()).min(1), assignedToId: z.string(), reason: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("leads:assign"); if ("response" in a) return a.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("leadIds and assignedToId are required");
  const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
  if (!assignee || !assignee.isActive) return err("Assignee not found or inactive", 404);
  let count = 0;
  for (const id of parsed.data.leadIds) {
    const lead = await prisma.lead.findUnique({ where: { id } }); if (!lead) continue;
    await prisma.lead.update({ where: { id }, data: { assignedToId: assignee.id, status: lead.status === "UNASSIGNED" || lead.status === "NEW" ? "ASSIGNED" : lead.status } });
    await prisma.leadAssignmentHistory.create({ data: { leadId: id, fromUserId: lead.assignedToId, toUserId: assignee.id, actorId: a.user.id, reason: parsed.data.reason } });
    count++;
  }
  await audit(a.user.id, "LEAD_ASSIGN_BULK", "Lead", undefined, { count, assignedToId: assignee.id });
  return ok({ assigned: count });
}
export async function GET(req: Request) {
  const a = await requireUser("leads:read"); if ("response" in a) return a.response;
  const leadId = new URL(req.url).searchParams.get("leadId");
  if (!leadId) return err("leadId required");
  return ok(await prisma.leadAssignmentHistory.findMany({ where: { leadId }, orderBy: { createdAt: "desc" } }));
}
