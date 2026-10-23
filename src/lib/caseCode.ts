/** Human case code, e.g. DSA-2026-0007. Pure + testable. */
export function formatCaseCode(date: Date, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("sequence must be a positive integer");
  return `DSA-${date.getFullYear()}-${String(sequence).padStart(4, "0")}`;
}
export function parseCaseCode(code: string): { year: number; sequence: number } | null {
  const m = /^DSA-(\d{4})-(\d{4,})$/.exec(code.trim());
  return m ? { year: Number(m[1]), sequence: Number(m[2]) } : null;
}
