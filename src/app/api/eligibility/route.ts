import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { assessEligibility } from "@/lib/eligibility";
import { z } from "zod";
export async function GET(req: Request) {
  const a = await requireUser("eligibility:manage"); if ("response" in a) return a.response;
  const caseId = new URL(req.url).searchParams.get("caseId"); if (!caseId) return err("caseId required");
  return ok(await prisma.eligibilityAssessment.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } }));
}
const schema = z.object({ caseId: z.string(), inputs: z.record(z.unknown()), assumptions: z.record(z.unknown()).optional(), config: z.object({ maxFoirPct: z.number().positive().optional() }).optional(), decision: z.enum(["PENDING","APPROVED_FOR_BANK_SUBMISSION","REJECTED","NEEDS_REVIEW"]).optional(), reviewerNotes: z.string().optional() });
export async function POST(req: Request) {
  const a = await requireUser("eligibility:manage"); if ("response" in a) return a.response;
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return err("Invalid eligibility payload");
  const results = assessEligibility(p.data.inputs as never, p.data.config || {});
  const rec = await prisma.eligibilityAssessment.create({ data: { caseId: p.data.caseId, inputs: p.data.inputs as object, assumptions: p.data.assumptions as object, results: results as unknown as object, decision: p.data.decision || "PENDING", reviewerId: a.user.id, reviewerNotes: p.data.reviewerNotes } });
  await audit(a.user.id, "ELIGIBILITY_CREATE", "EligibilityAssessment", rec.id, { decision: rec.decision });
  return ok(rec, 201);
}
