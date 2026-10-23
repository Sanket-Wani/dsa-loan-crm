import { requireUser, ok, pagination } from "@/lib/api";
import { buildRegisterRows, REGISTER_COLUMNS } from "@/lib/register";
export async function GET(req: Request) {
  const a = await requireUser("register:read"); if ("response" in a) return a.response;
  const { page, pageSize } = pagination(req);
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase() || "";
  let rows = await buildRegisterRows();
  if (q) rows = rows.filter((r) => Object.values(r).join(" ").toLowerCase().includes(q));
  const total = rows.length;
  return ok({ columns: REGISTER_COLUMNS, items: rows.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize });
}
