import { requireUser } from "@/lib/api";
import { buildRegisterRows, REGISTER_COLUMNS } from "@/lib/register";
import { toCsv } from "@/lib/csv";
import { registerToXlsx, registerRowValues } from "@/lib/xlsx";

/** Master register export: CSV by default, Excel with ?format=xlsx. */
export async function GET(req: Request) {
  const a = await requireUser("register:export"); if ("response" in a) return a.response;
  const format = new URL(req.url).searchParams.get("format") || "csv";
  const rows = await buildRegisterRows();
  if (format === "xlsx") {
    const buf = await registerToXlsx(rows);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=master-loan-register.xlsx",
      },
    });
  }
  const csv = toCsv([...REGISTER_COLUMNS], rows.map((r) => registerRowValues(r)));
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=master-loan-register.csv" } });
}
