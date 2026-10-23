"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { CASE_STAGES } from "@/lib/products";
export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null); const [error, setError] = useState(""); const [banks, setBanks] = useState<any[]>([]);
  const [bankForm, setBankForm] = useState({ bankId: "", managerName: "", loginDate: "", referenceNumber: "", requestedAmount: "" });
  const [elig, setElig] = useState({ monthlyIncome: "", existingMonthlyObligations: "", tenureMonths: "", annualInterestRatePct: "", decision: "PENDING", reviewerNotes: "" });
  const [queryForm, setQueryForm] = useState({ bankApplicationId: "", title: "" });
  const load = useCallback(async () => { const r = await fetch(`/api/cases/${id}`); const j = await r.json(); if (r.ok) setC(j); else setError(j.error); }, [id]);
  useEffect(() => { load(); fetch("/api/banks").then((r) => (r.ok ? r.json() : [])).then(setBanks).catch(() => []); }, [load]);
  if (error) return <Shell><div className="card text-red-700">{error}</div></Shell>;
  if (!c) return <Shell><div className="card">Loading…</div></Shell>;
  async function setStage(stage: string) { await fetch(`/api/cases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) }); load(); }
  async function docStatus(docId: string, status: string) { const reason = status === "REJECTED" ? prompt("Rejection reason (required)") : undefined; if (status === "REJECTED" && !reason) return; await fetch("/api/documents", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: docId, status, rejectionReason: reason }) }); load(); }
  async function uploadFile(doc: any, e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("documentId", doc.id); fd.append("file", f); const r = await fetch("/api/documents/upload", { method: "POST", body: fd }); if (!r.ok) alert((await r.json().catch(() => ({}))).error || "Upload failed"); load(); }
  async function genChecklist() { await fetch("/api/documents/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: id }) }); load(); }
  async function addBankApp() { if (!bankForm.bankId) return; const r = await fetch("/api/bank-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: id, bankId: bankForm.bankId, managerName: bankForm.managerName || undefined, referenceNumber: bankForm.referenceNumber || undefined, loginDate: bankForm.loginDate ? new Date(bankForm.loginDate).toISOString() : undefined, requestedAmount: bankForm.requestedAmount ? Number(bankForm.requestedAmount) : undefined }) }); if (!r.ok) alert((await r.json()).error); load(); }
  async function bankAppPatch(appId: string, data: any) { await fetch("/api/bank-applications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: appId, ...data }) }); load(); }
  async function addEligibility() { const inputs = { monthlyIncome: Number(elig.monthlyIncome) || undefined, existingMonthlyObligations: Number(elig.existingMonthlyObligations) || 0, requestedAmount: c.requestedAmount, tenureMonths: Number(elig.tenureMonths) || undefined, annualInterestRatePct: elig.annualInterestRatePct ? Number(elig.annualInterestRatePct) : undefined }; const r = await fetch("/api/eligibility", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: id, inputs, decision: elig.decision, reviewerNotes: elig.reviewerNotes || undefined }) }); if (!r.ok) alert((await r.json()).error); load(); }
  async function addQuery() { if (!queryForm.bankApplicationId || !queryForm.title) return; await fetch("/api/bank-queries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(queryForm) }); load(); }
  async function resolveQuery(qid: string) { await fetch("/api/bank-queries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: qid, status: "RESOLVED", resolution: "Resolved from case detail" }) }); load(); }
  return (
    <Shell>
      <div className="flex flex-wrap justify-between gap-2 mb-4"><div><h1 className="text-2xl font-bold">{c.code}</h1><p className="text-sm text-slate-500">{c.customer?.name} · {c.customer?.company || ""} · Product {c.productCode || "-"} · ₹{c.requestedAmount?.toLocaleString("en-IN") || "-"}</p></div><span className="badge h-fit">{c.stage} · {c.status}</span></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="card"><h2 className="font-semibold mb-2">Processing stage</h2><select value={c.stage} onChange={(e) => setStage(e.target.value)}>{CASE_STAGES.map((s) => <option key={s}>{s}</option>)}</select>
            <div className="mt-3 text-sm space-y-1">{c.statusHistory?.map((h: any) => <div key={h.id} className="py-1 border-b border-slate-100">{h.fromStatus ? `${h.fromStatus} → ` : ""}{h.toStatus} <span className="text-slate-400">{new Date(h.createdAt).toLocaleDateString("en-IN")}</span></div>)}</div></div>
          <div className="card space-y-2"><h2 className="font-semibold">Eligibility assessment</h2>
            <p className="text-[11px] text-slate-500">Arithmetic on supplied inputs only — no bank policy is implied. A reviewer decides.</p>
            <input type="number" placeholder="Monthly income (₹)" value={elig.monthlyIncome} onChange={(e) => setElig({ ...elig, monthlyIncome: e.target.value })} />
            <input type="number" placeholder="Existing monthly obligations (₹)" value={elig.existingMonthlyObligations} onChange={(e) => setElig({ ...elig, existingMonthlyObligations: e.target.value })} />
            <input type="number" placeholder="Tenure (months)" value={elig.tenureMonths} onChange={(e) => setElig({ ...elig, tenureMonths: e.target.value })} />
            <input type="number" placeholder="Interest rate % p.a. (assumption)" value={elig.annualInterestRatePct} onChange={(e) => setElig({ ...elig, annualInterestRatePct: e.target.value })} />
            <select value={elig.decision} onChange={(e) => setElig({ ...elig, decision: e.target.value })}>{["PENDING","APPROVED_FOR_BANK_SUBMISSION","REJECTED","NEEDS_REVIEW"].map((d) => <option key={d}>{d}</option>)}</select>
            <input placeholder="Reviewer notes" value={elig.reviewerNotes} onChange={(e) => setElig({ ...elig, reviewerNotes: e.target.value })} />
            <button className="btn" onClick={addEligibility}>Save assessment</button>
            {c.eligibility?.map((e2: any) => <div key={e2.id} className="text-xs bg-slate-50 rounded p-2">{e2.decision} · FOIR: {e2.results?.metrics?.foirPct ?? "—"}% · EMI: {e2.results?.metrics?.proposedEmi ? `₹${Math.round(e2.results.metrics.proposedEmi).toLocaleString("en-IN")}` : "—"}</div>)}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="card"><div className="flex justify-between items-center mb-2"><h2 className="font-semibold">Documents checklist</h2><button className="btn-secondary" onClick={genChecklist}>Generate from product</button></div>
            {c.documents?.length ? <table><thead><tr><th>Document</th><th>Category</th><th>Status</th><th>File</th><th>Action</th></tr></thead><tbody>{c.documents.map((d: any) => <tr key={d.id}><td>{d.name}{d.rejectionReason ? <div className="text-xs text-red-600">{d.rejectionReason}</div> : null}</td><td>{d.category}</td><td><span className="badge">{d.status}</span></td><td>{d.fileName ? <span className="text-xs"><a className="text-brand-700 underline" href={`/api/documents/download?id=${d.id}`}>{d.fileName}</a> (v{d.version}) <label className="text-brand-700 cursor-pointer ml-1">Replace<input type="file" className="hidden" onChange={(e) => uploadFile(d, e)} /></label></span> : <label className="text-brand-700 cursor-pointer text-xs">Attach<input type="file" className="hidden" onChange={(e) => uploadFile(d, e)} /></label>}</td><td><select className="w-auto" value={d.status} onChange={(e) => docStatus(d.id, e.target.value)}>{["REQUIRED","REQUESTED","RECEIVED","UNDER_VERIFICATION","VERIFIED","REJECTED","CORRECTION_REQUIRED","SUBMITTED_TO_BANK"].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">No checklist yet — generate it from the product requirements.</p>}</div>
          <div className="card"><h2 className="font-semibold mb-2">Bank applications</h2>
            <div className="grid md:grid-cols-5 gap-2 mb-3">
              <select value={bankForm.bankId} onChange={(e) => setBankForm({ ...bankForm, bankId: e.target.value })}><option value="">Bank…</option>{banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
              <input placeholder="Bank manager" value={bankForm.managerName} onChange={(e) => setBankForm({ ...bankForm, managerName: e.target.value })} />
              <input type="date" value={bankForm.loginDate} onChange={(e) => setBankForm({ ...bankForm, loginDate: e.target.value })} />
              <input placeholder="Reference no." value={bankForm.referenceNumber} onChange={(e) => setBankForm({ ...bankForm, referenceNumber: e.target.value })} />
              <button className="btn" onClick={addBankApp}>Add / log in</button>
            </div>
            {c.bankApplications?.map((app: any) => <div key={app.id} className="border border-slate-200 rounded-lg p-3 mb-2 text-sm">
              <b>{app.bank?.name}</b> · {app.status} · Ref: {app.referenceNumber || "-"} · Login: {app.loginDate ? new Date(app.loginDate).toLocaleDateString("en-IN") : "-"}
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <select className="w-auto" value={app.status} onChange={(e) => bankAppPatch(app.id, { status: e.target.value })}>{["PREPARING","LOGGED_IN","PD_PENDING","LEGAL_VALUATION","CREDIT_REVIEW","QUERY_RAISED","IN_PRINCIPLE_SANCTION","FINAL_SANCTION","DISBURSED","REJECTED","WITHDRAWN"].map((s) => <option key={s}>{s}</option>)}</select>
                <input className="w-36" type="number" placeholder="Sanctioned ₹" defaultValue={app.sanctionedAmount || ""} onBlur={(e) => e.target.value && bankAppPatch(app.id, { sanctionedAmount: Number(e.target.value) })} />
                <input className="w-36" type="number" placeholder="Disbursed ₹" defaultValue={app.disbursedAmount || ""} onBlur={(e) => e.target.value && bankAppPatch(app.id, { disbursedAmount: Number(e.target.value) })} />
              </div>
              <div className="mt-2 space-y-1">{app.queries?.map((q: any) => <div key={q.id} className="flex justify-between bg-slate-50 rounded px-2 py-1"><span>{q.title} — {q.status}</span>{q.status !== "RESOLVED" && q.status !== "CLOSED" && <button className="text-brand-700" onClick={() => resolveQuery(q.id)}>Resolve</button>}</div>)}</div>
            </div>)}
            <div className="flex gap-2 mt-2"><select value={queryForm.bankApplicationId} onChange={(e) => setQueryForm({ ...queryForm, bankApplicationId: e.target.value })}><option value="">Application…</option>{c.bankApplications?.map((app: any) => <option key={app.id} value={app.id}>{app.bank?.name}</option>)}</select><input placeholder="New bank query title" value={queryForm.title} onChange={(e) => setQueryForm({ ...queryForm, title: e.target.value })} /><button className="btn-secondary" onClick={addQuery}>Add query</button></div>
          </div>
          <div className="card"><h2 className="font-semibold mb-2">Tasks</h2>{c.tasks?.length ? c.tasks.map((t: any) => <div key={t.id} className="text-sm py-1 border-b border-slate-100">{t.title} — {t.status} ({t.priority})</div>) : <p className="text-sm text-slate-500">No tasks on this case. Create tasks via POST /api/tasks with this caseId.</p>}</div>
        </div>
      </div>
    </Shell>
  );
}
