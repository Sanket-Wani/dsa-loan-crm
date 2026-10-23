import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("cases:read"); if ("response" in a) return a.response;
  const caseId = new URL(req.url).searchParams.get("caseId");
  const where = caseId ? { caseId } : {};
  return ok(await prisma.bankApplication.findMany({ where, include: { bank: true, loanCase: { include: { customer: true } }, queries: true }, orderBy: { createdAt: "desc" }, take: 100 }));
}
const schema = z.object({ caseId: z.string(), bankId: z.string(), managerName: z.string().optional(), consultantName: z.string().optional(), loginDate: z.string().datetime().optional(), referenceNumber: z.string().optional(), requestedAmount: z.number().positive().optional(), assignedToId: z.string().optional(), remarks: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("banks:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid bank application payload");
  const app = await prisma.bankApplication.create({ data: { ...p.data, loginDate: p.data.loginDate ? new Date(p.data.loginDate) : undefined, status: p.data.loginDate ? "LOGGED_IN" : "PREPARING" } });
  await audit(a.user.id, "BANK_APP_CREATE", "BankApplication", app.id, {});
  return ok(app, 201);
}
const patch = z.object({ id: z.string(), status: z.enum(["PREPARING","LOGGED_IN","PD_PENDING","LEGAL_VALUATION","CREDIT_REVIEW","QUERY_RAISED","IN_PRINCIPLE_SANCTION","FINAL_SANCTION","DISBURSED","REJECTED","WITHDRAWN"]).optional(), sanctionedAmount: z.number().nonnegative().nullable().optional(), disbursedAmount: z.number().nonnegative().nullable().optional(), remarks: z.string().nullable().optional(), referenceNumber: z.string().nullable().optional() });
export async function PATCH(req: Request) {
  const a = await requireUser("banks:manage"); if ("response" in a) return a.response;
  const p = patch.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid payload");
  const { id, ...data } = p.data;
  const app = await prisma.bankApplication.update({ where: { id }, data: data as never });
  if (p.data.sanctionedAmount != null || p.data.disbursedAmount != null) await prisma.loanCase.update({ where: { id: app.caseId }, data: { sanctionedAmount: p.data.sanctionedAmount ?? undefined, disbursedAmount: p.data.disbursedAmount ?? undefined } }).catch(() => null);
  return ok(app);
}
