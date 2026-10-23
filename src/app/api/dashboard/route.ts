import { prisma } from "@/lib/db";
import { requireUser, ok } from "@/lib/api";
import { leadScope, caseScope } from "@/lib/rbac";
export async function GET() {
  const a = await requireUser("dashboard:read"); if ("response" in a) return a.response;
  const ls = leadScope(a.user) as never, cs = caseScope(a.user) as never;
  const now = new Date();
  const [totalLeads, unassigned, qualified, totalCases, pendingDocs, openQueries, overdueFollowUps, sanctionAgg, disbursedAgg, leadsByStatus, casesByStage, callsToday] = await Promise.all([
    prisma.lead.count({ where: ls }), prisma.lead.count({ where: { status: "UNASSIGNED" } }),
    prisma.lead.count({ where: { ...(leadScope(a.user) as object), status: "QUALIFIED" } }),
    prisma.loanCase.count({ where: cs }),
    prisma.caseDocument.count({ where: { status: { in: ["REQUIRED", "REQUESTED", "CORRECTION_REQUIRED"] } } }),
    prisma.bankQuery.count({ where: { status: { in: ["OPEN", "ASSIGNED"] } } }),
    prisma.followUp.count({ where: { status: "PENDING", dueAt: { lt: now } } }),
    prisma.bankApplication.aggregate({ _sum: { sanctionedAmount: true } }),
    prisma.bankApplication.aggregate({ _sum: { disbursedAmount: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.loanCase.groupBy({ by: ["stage"], _count: true }),
    prisma.callActivity.count({ where: { calledAt: { gte: new Date(now.toDateString()) } } }),
  ]);
  const conversionRate = totalLeads ? Math.round((qualified / totalLeads) * 10000) / 100 : 0;
  return ok({ role: a.user.role, totalLeads, unassignedLeads: unassigned, qualifiedLeads: qualified, conversionRate, totalCases, pendingDocuments: pendingDocs, openBankQueries: openQueries, overdueFollowUps, callsToday, sanctionedAmount: sanctionAgg._sum.sanctionedAmount || 0, disbursedAmount: disbursedAgg._sum.disbursedAmount || 0, leadsByStatus, casesByStage });
}
