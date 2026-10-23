import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("tasks:manage"); if ("response" in a) return a.response;
  const sp = new URL(req.url).searchParams; const where: Record<string, unknown> = {};
  if (a.user.role === "TELECALLER" || a.user.role === "BACK_OFFICE") where.assignedToId = a.user.id;
  if (sp.get("caseId")) where.caseId = sp.get("caseId");
  if (sp.get("status")) where.status = sp.get("status");
  return ok(await prisma.task.findMany({ where: where as never, orderBy: { dueAt: "asc" }, take: 100 }));
}
const schema = z.object({ title: z.string().min(3), description: z.string().optional(), priority: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(), dueAt: z.string().datetime().optional(), assignedToId: z.string().optional(), caseId: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("tasks:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid task payload");
  const task = await prisma.task.create({ data: { ...p.data, dueAt: p.data.dueAt ? new Date(p.data.dueAt) : undefined } });
  if (task.assignedToId) await prisma.notification.create({ data: { userId: task.assignedToId, title: `New task: ${task.title}`, body: task.description, entity: "Task", entityId: task.id, channel: "IN_APP" } });
  return ok(task, 201);
}
const patch = z.object({ id: z.string(), status: z.enum(["TODO","IN_PROGRESS","DONE","CANCELLED"]).optional(), title: z.string().optional() });
export async function PATCH(req: Request) {
  const a = await requireUser("tasks:manage"); if ("response" in a) return a.response;
  const p = patch.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload");
  const { id, ...data } = p.data; return ok(await prisma.task.update({ where: { id }, data }));
}
