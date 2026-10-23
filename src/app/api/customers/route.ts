import { prisma } from "@/lib/db";
import { requireUser, ok, err, pagination } from "@/lib/api";
import { normalizePhone, normalizeEmail } from "@/lib/duplicates";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("customers:read"); if ("response" in a) return a.response;
  const { page, pageSize, skip, take, searchParams } = pagination(req);
  const q = searchParams.get("q") || "";
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { company: { contains: q, mode: "insensitive" as const } }] } : {};
  const [total, items] = await Promise.all([prisma.customer.count({ where }), prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { cases: true } })]);
  return ok({ items, total, page, pageSize });
}
const schema = z.object({ name: z.string().min(2), phone: z.string().min(10), email: z.string().email().optional().nullable(), company: z.string().optional().nullable(), city: z.string().optional().nullable(), category: z.string().optional().nullable() });
export async function POST(req: Request) {
  const a = await requireUser("customers:read"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid customer payload");
  const np = normalizePhone(p.data.phone);
  const existing = await prisma.customer.findUnique({ where: { normalizedPhone: np } });
  if (existing) return ok({ ...existing, deduped: true });
  const c = await prisma.customer.create({ data: { name: p.data.name, phone: p.data.phone, normalizedPhone: np, email: p.data.email ?? undefined, normalizedEmail: normalizeEmail(p.data.email), company: p.data.company ?? undefined, city: p.data.city ?? undefined, category: p.data.category ?? undefined } });
  return ok(c, 201);
}
