import { requireUser } from "@/lib/api";
import { buildRegisterRows, REGISTER_COLUMNS } from "@/lib/register";
import { toCsv } from "@/lib/csv";
export async function GET() {
  const a = await requireUser("register:export"); if ("response" in a) return a.response;
  const rows = await buildRegisterRows();
  const csv = toCsv([...REGISTER_COLUMNS], rows.map((r) => REGISTER_COLUMNS.map((c) => r[c] as string | number)));
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=master-loan-register.csv" } });
}
