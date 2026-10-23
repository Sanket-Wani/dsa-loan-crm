import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";
const schema = z.object({ leadId: z.string().optional(), caseId: z.string().optional(), scheduledAt: z.string().datetime(), location: z.string().optional(), assignedToId: z.string().optional(), notes: z.string().optional(), status: z.enum(["SCHEDULED","COMPLETED","CANCELLED","RESCHEDULED"]).optional() });
export async function GET(req: Request) {
  const a = await requireUser("meetings:manage"); if ("response" in a) return a.response;
  const sp = new URL(req.url).searchParams; const where: Record<string, unknown> = {};
  if (sp.get("leadId")) where.leadId = sp.get("leadId");
  if (sp.get("caseId")) where.caseId = sp.get("caseId");
  return ok(await prisma.meeting.findMany({ where: where as never, orderBy: { scheduledAt: "asc" }, take: 100 }));
}
export async function POST(req: Request) {
  const a = await requireUser("meetings:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid meeting payload");
  return ok(await prisma.meeting.create({ data: { ...p.data, scheduledAt: new Date(p.data.scheduledAt) } }), 201);
}
