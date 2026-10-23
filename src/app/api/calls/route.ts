import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { canAccessLead } from "@/lib/rbac";
import { z } from "zod";
const schema = z.object({ leadId: z.string(), outcome: z.enum(["ANSWERED","NOT_ANSWERED","BUSY","SWITCHED_OFF","CALLBACK_REQUESTED","INTERESTED","NOT_INTERESTED","WRONG_NUMBER","OTHER"]).default("OTHER"), remarks: z.string().optional(), objections: z.string().optional(), requirements: z.string().optional(), durationSeconds: z.number().int().nonnegative().optional() });
export async function POST(req: Request) {
  const a = await requireUser("calls:create"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid call payload");
  const lead = await prisma.lead.findUnique({ where: { id: p.data.leadId } }); if (!lead) return err("Lead not found", 404);
  if (!canAccessLead(a.user, lead)) return err("Forbidden", 403);
  const call = await prisma.callActivity.create({ data: { ...p.data, callerId: a.user.id } });
  return ok(call, 201);
}
export async function GET(req: Request) {
  const a = await requireUser("leads:read"); if ("response" in a) return a.response;
  const leadId = new URL(req.url).searchParams.get("leadId"); if (!leadId) return err("leadId required");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } }); if (!lead) return err("Lead not found", 404);
  if (!canAccessLead(a.user, lead)) return err("Forbidden", 403);
  return ok(await prisma.callActivity.findMany({ where: { leadId }, orderBy: { calledAt: "desc" } }));
}
