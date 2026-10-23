/**
 * Eligibility helpers — deliberately NO invented bank policy.
 * We only do transparent arithmetic on inputs the reviewer supplies and
 * surface it for a human decision. Thresholds, if any, are passed in as
 * explicit configuration by an authorised reviewer, never hardcoded policy.
 */
export interface EligibilityInputs { monthlyIncome?: number; existingMonthlyObligations?: number; requestedAmount?: number; tenureMonths?: number; annualInterestRatePct?: number }
export interface EligibilityConfig { maxFoirPct?: number } // optional, reviewer-configured
export function computeEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 1200;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}
export function assessEligibility(inputs: EligibilityInputs, config: EligibilityConfig = {}) {
  const missing: string[] = [];
  if (!inputs.monthlyIncome) missing.push("monthlyIncome");
  if (!inputs.requestedAmount) missing.push("requestedAmount");
  if (missing.length) return { status: "INCOMPLETE" as const, missing, metrics: null, withinConfiguredFoir: null };
  const income = inputs.monthlyIncome!, obligations = inputs.existingMonthlyObligations ?? 0;
  const proposedEmi = inputs.tenureMonths && inputs.annualInterestRatePct != null ? computeEmi(inputs.requestedAmount!, inputs.annualInterestRatePct, inputs.tenureMonths) : null;
  const totalObligations = obligations + (proposedEmi ?? 0);
  const foirPct = income > 0 ? (totalObligations / income) * 100 : null;
  const within = config.maxFoirPct != null && foirPct != null ? foirPct <= config.maxFoirPct : null;
  return {
    status: "READY_FOR_REVIEW" as const, missing: [] as string[],
    metrics: { monthlyIncome: income, existingMonthlyObligations: obligations, proposedEmi, foirPct: foirPct != null ? Math.round(foirPct * 100) / 100 : null },
    withinConfiguredFoir: within,
    note: "Metrics are arithmetic on supplied inputs only. No bank policy is implied; a reviewer must decide.",
  };
}
