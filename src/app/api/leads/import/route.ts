import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { parseCsv, validateImportRows } from "@/lib/csv";
import { parseXlsxLeads } from "@/lib/xlsx";

export const runtime = "nodejs";

/**
 * Lead import from CSV or XLSX. Accepts any of:
 * - JSON { csv: "<csv text>" }                     (original contract)
 * - JSON { xlsxBase64: "<base64 .xlsx content>" }
 * - multipart/form-data with a `file` field (.csv or .xlsx)
 * All formats converge on Record<string,string> rows and the same
 * validation / duplicate-detection pipeline, returning a per-row report.
 */
export async function POST(req: Request) {
  const a = await requireUser("leads:import"); if ("response" in a) return a.response;
  let rows: Record<string, string>[] | null = null;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return err("Provide a file field (.csv or .xlsx)");
      const buf = Buffer.from(await file.arrayBuffer());
      rows = file.name.toLowerCase().endsWith(".xlsx") ? await parseXlsxLeads(buf) : parseCsv(buf.toString("utf8"));
    } else {
      const body = await req.json().catch(() => null) as { csv?: string; xlsxBase64?: string } | null;
      if (body?.csv) rows = parseCsv(body.csv);
      else if (body?.xlsxBase64) rows = await parseXlsxLeads(Buffer.from(body.xlsxBase64, "base64"));
      else return err("Provide JSON { csv } or { xlsxBase64 }, or a multipart file upload");
    }
  } catch {
    return err("Could not parse the uploaded file", 422);
  }
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
