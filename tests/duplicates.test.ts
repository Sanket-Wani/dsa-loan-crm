import { describe, it, expect } from "vitest";
import { normalizePhone, isDuplicate, findDuplicates } from "@/lib/duplicates";
describe("duplicate detection", () => {
  it("normalizes +91 and leading 0", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });
  it("matches by phone even if formatted differently", () => {
    expect(isDuplicate({ phone: "+919876543210" }, { phone: "98765 43210" })).toBe(true);
  });
  it("matches by email case-insensitively", () => {
    expect(isDuplicate({ phone: "9876543210", email: "A@B.com" }, { phone: "9123456780", email: "a@b.com" })).toBe(true);
  });
  it("does not flag distinct contacts", () => {
    expect(findDuplicates({ phone: "9876543210", email: "x@y.in" }, [{ phone: "9123456780", email: "p@q.in" }])).toHaveLength(0);
  });
});
