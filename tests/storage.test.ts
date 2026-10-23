import { describe, it, expect } from "vitest";
import { validateUpload, sanitizeFileName, extensionForMime, makeStorageKey, resolveLocalPath, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { registerRowValues } from "@/lib/xlsx";
import { REGISTER_COLUMNS, type RegisterRow } from "@/lib/register";
import path from "path";

describe("storage helpers", () => {
  it("generates keys decoupled from the original file name", () => {
    const key = makeStorageKey("case1", "doc1", "application/pdf", "fixed-uuid");
    expect(key).toBe("case1/doc1/fixed-uuid.pdf");
    expect(key).not.toContain("passport");
  });
  it("derives extensions from MIME type only", () => {
    expect(extensionForMime("application/pdf")).toBe(".pdf");
    expect(extensionForMime("image/png")).toBe(".png");
    expect(extensionForMime("application/zip")).toBe("");
  });
  it("validates type and size", () => {
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: 100 })).toBeNull();
    expect(validateUpload({ mimeType: "application/zip", sizeBytes: 100 })).toMatch(/Only PDF/);
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: 0 })).toMatch(/size/);
    expect(validateUpload({ mimeType: "application/pdf", sizeBytes: MAX_UPLOAD_BYTES + 1 })).toMatch(/size/);
  });
  it("sanitises display file names", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe(".._.._etc_passwd.pdf");
    expect(sanitizeFileName("a/b\\c.pdf")).toBe("a_b_c.pdf");
  });
  it("rejects storage keys that escape the storage directory", () => {
    expect(() => resolveLocalPath("/tmp/store", "../secret.txt")).toThrow(/Invalid storage key/);
    expect(resolveLocalPath("/tmp/store", "case1/doc1/f.pdf")).toBe(path.resolve("/tmp/store", "case1/doc1/f.pdf"));
  });
});

describe("xlsx register mapping", () => {
  it("maps a register row to values in REGISTER_COLUMNS order", () => {
    const row = {
      id: "x", caseId: "c1", caseCode: "DSA-2026-0001",
      "Login Date": "2026-10-23", "Company Name": "Acme Pvt Ltd", "Client Name": "Ravi",
      Product: "BL", Status: "DISBURSED", "Bank Name": "HDFC Bank",
      "Bank Manager / Consultant": "Mgr", "Office Sales": "Sales1", "Employee Code": "EMP003",
      "Reference / Telecaller": "Dev Telecaller", Remarks: "ok",
      "Sanctioned Loan Amount": 900000, "Disbursed Loan Amount": 850000,
    } as unknown as RegisterRow;
    const values = registerRowValues(row);
    expect(values).toHaveLength(REGISTER_COLUMNS.length);
    expect(values[0]).toBe("2026-10-23");
    expect(values[2]).toBe("Ravi");
    expect(values[REGISTER_COLUMNS.indexOf("Sanctioned Loan Amount")]).toBe(900000);
    expect(values[REGISTER_COLUMNS.indexOf("Disbursed Loan Amount")]).toBe(850000);
  });
});
