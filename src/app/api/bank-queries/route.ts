import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("queries:manage"); if ("response" in a) return a.response;
  const sp = new URL(req.url).searchParams; const where: Record<string, unknown> = {};
  if (sp.get("bankApplicationId")) where.bankApplicationId = sp.get("bankApplicationId");
  if (sp.get("status")) where.status = sp.get("status");
  return ok(await prisma.bankQuery.findMany({ where: where as never, orderBy: { createdAt: "desc" }, take: 100 }));
}
const schema = z.object({ bankApplicationId: z.string(), title: z.string().min(3), description: z.string().optional(), assignedToId: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("queries:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid query payload");
  return ok(await prisma.bankQuery.create({ data: { ...p.data, status: p.data.assignedToId ? "ASSIGNED" : "OPEN" } }), 201);
}
const patch = z.object({ id: z.string(), status: z.enum(["OPEN","ASSIGNED","RESOLVED","CLOSED"]).optional(), assignedToId: z.string().nullable().optional(), resolution: z.string().optional() });
export async function PATCH(req: Request) {
  const a = await requireUser("queries:manage"); if ("response" in a) return a.response;
  const p = patch.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload");
  const { id, ...data } = p.data;
  return ok(await prisma.bankQuery.update({ where: { id }, data: { ...data, resolvedAt: data.status === "RESOLVED" || data.status === "CLOSED" ? new Date() : undefined } as never }));
}
