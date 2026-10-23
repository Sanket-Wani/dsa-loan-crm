import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";
export async function GET() {
  const a = await requireUser(); if ("response" in a) return a.response;
  return ok(await prisma.bank.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }));
}
const schema = z.object({ name: z.string().min(2), code: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("banks:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid bank payload");
  return ok(await prisma.bank.create({ data: p.data }), 201);
}
