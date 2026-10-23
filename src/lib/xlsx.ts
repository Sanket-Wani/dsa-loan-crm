import ExcelJS from "exceljs";
import { REGISTER_COLUMNS, type RegisterRow } from "./register";

/** Pure mapping: register rows -> ordered cell values in REGISTER_COLUMNS order. Used by CSV and XLSX exporters and unit tests. */
export function registerRowValues(row: RegisterRow): (string | number)[] {
  return REGISTER_COLUMNS.map((c) => {
    const v = row[c] as string | number | "" | undefined;
    return v === undefined || v === "" ? "" : v;
  });
}

/** Build a valid .xlsx workbook (Buffer) of master-register rows. */
export async function registerToXlsx(rows: RegisterRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DSA Loan CRM";
  const ws = wb.addWorksheet("Master Loan Register");
  ws.addRow([...REGISTER_COLUMNS]);
  ws.getRow(1).font = { bold: true };
  for (const r of rows) ws.addRow(registerRowValues(r));
  ws.columns.forEach((col) => { col.width = 20; });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

/**
 * Parse the first worksheet of an .xlsx lead-import file into the same
 * Record<string,string> shape the CSV parser produces (header row first,
 * header names normalised to lowercase_with_underscores), so the existing
 * validateImportRows() pipeline applies unchanged.
 */
export async function parseXlsxLeads(data: Buffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as never);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  ws.eachRow((row, rowNumber) => {
    const values = (row.values as unknown[]).slice(1).map((v) => {
      if (v == null) return "";
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object") {
        const o = v as { text?: string; result?: unknown };
        return String(o.text ?? o.result ?? "");
      }
      return String(v);
    });
    if (rowNumber === 1) { headers = values.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")); return; }
    if (!values.some((v) => v.trim().length)) return;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim(); });
    rows.push(obj);
  });
  return rows;
}
