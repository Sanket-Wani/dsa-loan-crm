import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { z } from "zod";
export async function GET() { const a = await requireUser(); if ("response" in a) return a.response; return ok(await prisma.loanProduct.findMany({ orderBy: { code: "asc" } })); }
const schema = z.object({ code: z.string().min(2).max(5), name: z.string().min(3), description: z.string().optional(), pendingConfirmation: z.boolean().optional() });
export async function POST(req: Request) { const a = await requireUser("products:manage"); if ("response" in a) return a.response; const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid product payload"); const prod = await prisma.loanProduct.create({ data: { ...p.data, code: p.data.code.toUpperCase() } }); await audit(a.user.id, "PRODUCT_CREATE", "LoanProduct", prod.id, {}); return ok(prod, 201); }
const patch = z.object({ id: z.string(), name: z.string().optional(), description: z.string().nullable().optional(), isActive: z.boolean().optional(), pendingConfirmation: z.boolean().optional() });
export async function PATCH(req: Request) { const a = await requireUser("products:manage"); if ("response" in a) return a.response; const p = patch.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload"); const { id, ...data } = p.data; return ok(await prisma.loanProduct.update({ where: { id }, data: data as never })); }
