import { describe, it, expect } from "vitest";
import { parseCsv, validateImportRows, toCsv } from "@/lib/csv";
describe("CSV import", () => {
  it("parses quoted fields", () => {
    const rows = parseCsv('name,phone,company\n"Sharma, A",9876543210,"Acme, Ltd"');
    expect(rows[0].name).toBe("Sharma, A");
    expect(rows[0].company).toBe("Acme, Ltd");
  });
  it("reports per-row errors", () => {
    const res = validateImportRows([
      { name: "", phone: "123", email: "bad" },
      { name: "Good Lead", phone: "9876543210", email: "good@x.in" },
    ]);
    expect(res[0].errors.length).toBeGreaterThan(0);
    expect(res[0].row).toBe(2);
    expect(res[1].errors).toHaveLength(0);
    expect(res[1].data?.name).toBe("Good Lead");
  });
  it("flags duplicates against existing and within the file", () => {
    const res = validateImportRows(
      [{ name: "A", phone: "9876543210" }, { name: "B", phone: "+91 98765 43210" }],
      [{ phone: "9000000001", email: null }],
    );
    expect(res[1].duplicate).toBe(true);
    expect(res[1].errors.join(" ")).toMatch(/duplicate/i);
  });
  it("round-trips CSV export escaping", () => {
    expect(toCsv(["a","b"], [["x,y", 'he said "hi"']])).toContain('"x,y"');
  });
});
