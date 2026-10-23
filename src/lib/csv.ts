import { normalizePhone, normalizeEmail, isValidIndianPhone } from "./duplicates";
/** Minimal RFC-4180-ish CSV parser (quoted fields, commas, escaped quotes). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim().length));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}
export interface ImportRowResult { row: number; data?: Record<string, unknown>; errors: string[]; duplicate?: boolean }
const ALIASES: Record<string, string[]> = {
  name: ["name", "customer_name", "client_name", "full_name"],
  phone: ["phone", "mobile", "contact", "phone_number", "mobile_number"],
  email: ["email", "email_id"],
  company: ["company", "company_name"],
  city: ["city", "location"],
  requested_amount: ["requested_amount", "amount", "loan_amount"],
  source: ["source", "lead_source"],
  product_code: ["product_code", "product", "loan_product"],
};
function pick(row: Record<string, string>, key: string): string {
  for (const a of ALIASES[key]) if (row[a]) return row[a];
  return "";
}
/** Pure validation used by both the import API and unit tests. No DB access here. */
export function validateImportRows(rows: Record<string, string>[], existing: { phone: string; email?: string | null }[] = []): ImportRowResult[] {
  const seen: { phone: string; email?: string | null }[] = [...existing];
  return rows.map((row, i) => {
    const errors: string[] = [];
    const name = pick(row, "name"), phoneRaw = pick(row, "phone"), email = pick(row, "email");
    if (!name) errors.push("name is required");
    if (!phoneRaw) errors.push("phone is required");
    else if (!isValidIndianPhone(phoneRaw)) errors.push("phone must be a valid 10-digit Indian mobile number");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email is invalid");
    const amountRaw = pick(row, "requested_amount");
    let amount: number | undefined;
    if (amountRaw) { amount = Number(amountRaw.replace(/[^0-9.]/g, "")); if (!Number.isFinite(amount) || amount <= 0) errors.push("requested_amount must be a positive number"); }
    const candidate = { phone: phoneRaw, email: email || null };
    const duplicate = !!phoneRaw && seen.some((s) => normalizePhone(s.phone) === normalizePhone(phoneRaw) || (normalizeEmail(s.email) && normalizeEmail(s.email) === normalizeEmail(email)));
    if (duplicate) errors.push("duplicate lead (phone or email already exists)");
    if (!errors.length) seen.push(candidate);
    return {
      row: i + 2, // + header + 1-based
      errors, duplicate,
      data: errors.length ? undefined : {
        name, phone: phoneRaw, normalizedPhone: normalizePhone(phoneRaw), email: email || null,
        normalizedEmail: normalizeEmail(email), company: pick(row, "company") || null, city: pick(row, "city") || null,
        requestedAmount: amount ?? null, source: pick(row, "source") || "IMPORT", productCode: pick(row, "product_code") || null,
      },
    };
  });
}
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
