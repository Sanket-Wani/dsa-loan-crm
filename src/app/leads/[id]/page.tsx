"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
export default function LeadDetail() {
  const { id } = useParams<{ id: string }>(); const router = useRouter();
  const [lead, setLead] = useState<any>(null); const [error, setError] = useState("");
  const [call, setCall] = useState({ outcome: "ANSWERED", remarks: "", objections: "", requirements: "" });
  const [followUp, setFollowUp] = useState(""); const [meeting, setMeeting] = useState({ scheduledAt: "", location: "" });
  const [handoverTo, setHandoverTo] = useState(""); const [employees, setEmployees] = useState<any[]>([]);
  const load = useCallback(async () => { const r = await fetch(`/api/leads/${id}`); const j = await r.json(); if (r.ok) setLead(j); else setError(j.error || "Failed"); }, [id]);
  useEffect(() => { load(); fetch("/api/employees?pageSize=100").then((r) => (r.ok ? r.json() : null)).then((j) => j && setEmployees(j.items)).catch(() => null); }, [load]);
  if (error) return <Shell><div className="card text-red-700">{error}</div></Shell>;
  if (!lead) return <Shell><div className="card">Loading…</div></Shell>;
  async function setStatus(status: string) { await fetch(`/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load(); }
  async function logCall() { const r = await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, ...call }) }); if (!r.ok) alert((await r.json()).error); load(); }
  async function addFollowUp() { if (!followUp) return; await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, dueAt: new Date(followUp).toISOString() }) }); load(); }
  async function addMeeting() { if (!meeting.scheduledAt) return; await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, scheduledAt: new Date(meeting.scheduledAt).toISOString(), location: meeting.location }) }); await setStatus("MEETING_SCHEDULED"); load(); }
  async function doHandover() { if (!handoverTo) return; const r = await fetch("/api/handovers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id, toUserId: handoverTo, reason: "Manual handover from lead detail" }) }); if (!r.ok) alert((await r.json()).error); load(); }
  async function createCase() { const r = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: id }) }); const j = await r.json(); if (r.ok) router.push(`/cases/${j.id}`); else alert(j.error); }
  return (
    <Shell>
      <div className="flex flex-wrap justify-between gap-2 mb-4"><div><h1 className="text-2xl font-bold">{lead.name}</h1><p className="text-sm text-slate-500">{lead.phone} · {lead.email || ""} · {lead.company || ""} {lead.city || ""}</p></div><span className="badge h-fit">{lead.status}</span></div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="card space-y-2"><h2 className="font-semibold">Qualify / status</h2>
            <select onChange={(e) => setStatus(e.target.value)} value={lead.status}><option value={lead.status}>{lead.status}</option>{["CONTACTED","FOLLOW_UP_REQUIRED","INTERESTED","QUALIFIED","NOT_INTERESTED","UNREACHABLE","DISQUALIFIED"].map((s) => <option key={s}>{s}</option>)}</select>
            <p className="text-xs text-slate-500">Requested: {lead.requestedAmount ? `₹${lead.requestedAmount.toLocaleString("en-IN")}` : "-"} · Product: {lead.productCode || "-"} · Source: {lead.source}</p>
            <button className="btn w-full justify-center" onClick={createCase} disabled={lead.status !== "QUALIFIED"}>Create loan case{lead.status !== "QUALIFIED" ? " (lead must be Qualified)" : ""}</button>
          </div>
          <div className="card space-y-2"><h2 className="font-semibold">Log a call</h2>
            <select value={call.outcome} onChange={(e) => setCall({ ...call, outcome: e.target.value })}>{["ANSWERED","NOT_ANSWERED","BUSY","SWITCHED_OFF","CALLBACK_REQUESTED","INTERESTED","NOT_INTERESTED","WRONG_NUMBER","OTHER"].map((o) => <option key={o}>{o}</option>)}</select>
            <input placeholder="Remarks" value={call.remarks} onChange={(e) => setCall({ ...call, remarks: e.target.value })} />
            <input placeholder="Objections" value={call.objections} onChange={(e) => setCall({ ...call, objections: e.target.value })} />
            <input placeholder="Customer requirements" value={call.requirements} onChange={(e) => setCall({ ...call, requirements: e.target.value })} />
            <button className="btn" onClick={logCall}>Save call</button>
          </div>
          <div className="card space-y-2"><h2 className="font-semibold">Follow-up & meeting</h2>
            <input type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /><button className="btn-secondary" onClick={addFollowUp}>Schedule follow-up</button>
            <input type="datetime-local" value={meeting.scheduledAt} onChange={(e) => setMeeting({ ...meeting, scheduledAt: e.target.value })} />
            <input placeholder="Meeting location" value={meeting.location} onChange={(e) => setMeeting({ ...meeting, location: e.target.value })} /><button className="btn-secondary" onClick={addMeeting}>Schedule meeting</button>
          </div>
          <div className="card space-y-2"><h2 className="font-semibold">Handover</h2>
            <select value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)}><option value="">Select employee…</option>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}</select>
            <button className="btn" onClick={doHandover} disabled={!handoverTo}>Hand over lead</button>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="card"><h2 className="font-semibold mb-2">Call history</h2>{lead.calls?.length ? lead.calls.map((c: any) => <div key={c.id} className="text-sm py-2 border-b border-slate-100"><b>{c.outcome}</b> · {new Date(c.calledAt).toLocaleString("en-IN")} <div className="text-slate-600">{c.remarks || ""} {c.objections ? `· Objection: ${c.objections}` : ""} {c.requirements ? `· Needs: ${c.requirements}` : ""}</div></div>) : <p className="text-sm text-slate-500">No calls logged yet.</p>}</div>
          <div className="card"><h2 className="font-semibold mb-2">Follow-ups & meetings</h2>
            {lead.followUps?.map((f: any) => <div key={f.id} className="text-sm py-1">Follow-up: {new Date(f.dueAt).toLocaleString("en-IN")} — {f.status}</div>)}
            {lead.meetings?.map((m: any) => <div key={m.id} className="text-sm py-1">Meeting: {new Date(m.scheduledAt).toLocaleString("en-IN")} @ {m.location || "—"} — {m.status}</div>)}
            {!lead.followUps?.length && !lead.meetings?.length && <p className="text-sm text-slate-500">Nothing scheduled.</p>}</div>
          <div className="card"><h2 className="font-semibold mb-2">Assignment history</h2>{lead.history?.length ? lead.history.map((h: any) => <div key={h.id} className="text-sm py-1 border-b border-slate-100">{new Date(h.createdAt).toLocaleString("en-IN")} — {h.reason || "Assigned"} {h.toUserId ? `→ ${employees.find((e: any) => e.id === h.toUserId)?.name || h.toUserId}` : ""}</div>) : <p className="text-sm text-slate-500">No assignments recorded.</p>}</div>
        </div>
      </div>
    </Shell>
  );
}
