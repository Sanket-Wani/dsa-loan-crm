export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  // India: strip country code 91 / trunk 0, keep last 10 digits
  return digits.length > 10 ? digits.slice(-10) : digits;
}
export function normalizeEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const e = raw.trim().toLowerCase();
  return e.length ? e : null;
}
export function isValidIndianPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}
export interface ContactLike { phone: string; email?: string | null }
/** Duplicate if normalized phone matches OR normalized email matches (when present). */
export function isDuplicate(a: ContactLike, b: ContactLike): boolean {
  if (normalizePhone(a.phone) && normalizePhone(a.phone) === normalizePhone(b.phone)) return true;
  const ea = normalizeEmail(a.email), eb = normalizeEmail(b.email);
  return !!ea && !!eb && ea === eb;
}
export function findDuplicates<T extends ContactLike>(candidate: ContactLike, existing: T[]): T[] {
  return existing.filter((e) => isDuplicate(candidate, e));
}
