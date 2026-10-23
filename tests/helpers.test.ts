import { describe, it, expect } from "vitest";
import { formatCaseCode, parseCaseCode } from "@/lib/caseCode";
import { assessEligibility, computeEmi } from "@/lib/eligibility";
import { LOAN_PRODUCTS } from "@/lib/products";
describe("case code", () => {
  it("formats and parses", () => {
    expect(formatCaseCode(new Date("2026-01-15"), 7)).toBe("DSA-2026-0007");
    expect(parseCaseCode("DSA-2026-0007")).toEqual({ year: 2026, sequence: 7 });
    expect(parseCaseCode("nope")).toBeNull();
  });
  it("rejects invalid sequence", () => { expect(() => formatCaseCode(new Date(), 0)).toThrow(); });
});
describe("eligibility helpers (no invented bank policy)", () => {
  it("computes EMI arithmetic", () => { expect(computeEmi(120000, 0, 12)).toBe(10000); expect(computeEmi(100000, 12, 12)).toBeGreaterThan(8333); });
  it("returns INCOMPLETE without key inputs", () => { expect(assessEligibility({}).status).toBe("INCOMPLETE"); });
  it("returns READY_FOR_REVIEW with metrics and no auto-decision when no threshold configured", () => {
    const r = assessEligibility({ monthlyIncome: 100000, existingMonthlyObligations: 10000, requestedAmount: 500000, tenureMonths: 60, annualInterestRatePct: 10 });
    expect(r.status).toBe("READY_FOR_REVIEW");
    expect(r.withinConfiguredFoir).toBeNull();
    expect(r.metrics?.foirPct).toBeGreaterThan(10);
  });
});
describe("product catalogue", () => {
  it("has all 16 codes with CL and CP pending confirmation", () => {
    expect(LOAN_PRODUCTS).toHaveLength(16);
    expect(LOAN_PRODUCTS.find((p) => p.code === "CL")?.pendingConfirmation).toBe(true);
    expect(LOAN_PRODUCTS.find((p) => p.code === "CP")?.pendingConfirmation).toBe(true);
    expect(LOAN_PRODUCTS.find((p) => p.code === "LAP")?.name).toBe("Loan Against Property");
  });
});
