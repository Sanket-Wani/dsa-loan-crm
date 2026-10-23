"use client";
import Shell from "@/components/Shell";
import { useEffect, useState } from "react";
interface Metrics { role: string; totalLeads: number; unassignedLeads: number; qualifiedLeads: number; conversionRate: number; totalCases: number; pendingDocuments: number; openBankQueries: number; overdueFollowUps: number; callsToday: number; sanctionedAmount: number; disbursedAmount: number; leadsByStatus: { status: string; _count: number }[]; casesByStage: { stage: string; _count: number }[] }
export default function Dashboard() {
  const [m, setM] = useState<Metrics | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/dashboard").then(async (r) => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }).then(setM).catch((e) => setError(e.message)); }, []);
  const cards = m ? [
    ["Total leads", m.totalLeads], ["Unassigned leads", m.unassignedLeads], ["Qualified leads", m.qualifiedLeads], ["Conversion %", m.conversionRate],
    ["Loan cases", m.totalCases], ["Pending documents", m.pendingDocuments], ["Open bank queries", m.openBankQueries], ["Overdue follow-ups", m.overdueFollowUps],
    ["Calls today", m.callsToday], ["Sanctioned (₹)", m.sanctionedAmount.toLocaleString("en-IN")], ["Disbursed (₹)", m.disbursedAmount.toLocaleString("en-IN")],
  ] : [];
  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4">Dashboard {m && <span className="badge ml-2">{m.role}</span>}</h1>
      {error && <div className="card text-red-700">{error}</div>}
      {!m && !error && <div className="card">Loading metrics from the database…</div>}
      {m && <>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map(([k, v]) => <div key={String(k)} className="card"><div className="text-xs text-slate-500">{k}</div><div className="text-2xl font-bold mt-1">{v}</div></div>)}
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="card"><h2 className="font-semibold mb-2">Leads by status</h2>{m.leadsByStatus.length ? m.leadsByStatus.map((s) => <div key={s.status} className="flex justify-between text-sm py-1 border-b border-slate-100"><span>{s.status}</span><b>{s._count}</b></div>) : <p className="text-sm text-slate-500">No leads yet.</p>}</div>
          <div className="card"><h2 className="font-semibold mb-2">Cases by stage</h2>{m.casesByStage.length ? m.casesByStage.map((s) => <div key={s.stage} className="flex justify-between text-sm py-1 border-b border-slate-100"><span>{s.stage}</span><b>{s._count}</b></div>) : <p className="text-sm text-slate-500">No cases yet.</p>}</div>
        </div>
      </>}
    </Shell>
  );
}
