import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { parseCsv, validateImportRows } from "@/lib/csv";
export async function POST(req: Request) {
  const a = await requireUser("leads:import"); if ("response" in a) return a.response;
  const body = await req.json().catch(() => null) as { csv?: string } | null;
  if (!body?.csv) return err("Provide JSON { csv: \"<csv text>\" }");
  const rows = parseCsv(body.csv);
  if (!rows.length) return err("No data rows found");
  const existing = await prisma.lead.findMany({ select: { phone: true, email: true } });
  const results = validateImportRows(rows, existing);
  let imported = 0;
  for (const r of results) {
    if (r.errors.length || !r.data) continue;
    const d = r.data as { name: string; phone: string; normalizedPhone: string; email: string | null; normalizedEmail: string | null; company: string | null; city: string | null; requestedAmount: number | null; source: string; productCode: string | null };
    const product = d.productCode ? await prisma.loanProduct.findUnique({ where: { code: d.productCode } }) : null;
    await prisma.lead.create({ data: { name: d.name, phone: d.phone, normalizedPhone: d.normalizedPhone, email: d.email ?? undefined, normalizedEmail: d.normalizedEmail, company: d.company ?? undefined, city: d.city ?? undefined, requestedAmount: d.requestedAmount ?? undefined, source: d.source, productCode: d.productCode ?? undefined, productId: product?.id, status: "UNASSIGNED", createdById: a.user.id } });
    imported++;
  }
  await audit(a.user.id, "LEAD_IMPORT", "Lead", undefined, { imported, total: rows.length });
  return ok({ totalRows: rows.length, imported, failed: rows.length - imported, report: results.map((r) => ({ row: r.row, errors: r.errors, duplicate: !!r.duplicate })) });
}
