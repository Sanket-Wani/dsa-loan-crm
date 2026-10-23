"use client";
import Shell from "@/components/Shell";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function TelecallerQueue() {
  const [leads, setLeads] = useState<any[]>([]); const [followUps, setFollowUps] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([fetch("/api/leads?pageSize=100").then((r) => r.json()), fetch("/api/followups?when=overdue").then((r) => r.json()), fetch("/api/followups?when=upcoming").then((r) => r.json())]).then(([l, o, u]) => { setLeads(l.items || []); setFollowUps([...(Array.isArray(o) ? o : []), ...(Array.isArray(u) ? u : [])]); setLoading(false); }).catch(() => setLoading(false)); }, []);
  return (
    <Shell><h1 className="text-2xl font-bold mb-4">Telecaller queue</h1>
      {loading ? <div className="card">Loading your assigned leads…</div> : <>
      <div className="card mb-4"><h2 className="font-semibold mb-2">Follow-ups (overdue first, then upcoming)</h2>{followUps.length ? followUps.map((f) => <div key={f.id} className="text-sm py-1 border-b border-slate-100">{new Date(f.dueAt).toLocaleString("en-IN")} — {f.lead ? <Link className="text-brand-700" href={`/leads/${f.lead.id}`}>{f.lead.name}</Link> : f.caseId} <span className="badge">{f.dueAt < new Date().toISOString() ? "OVERDUE" : f.status}</span></div>) : <p className="text-sm text-slate-500">No pending follow-ups.</p>}</div>
      <div className="card overflow-x-auto">{leads.length ? <table><thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Next follow-up</th></tr></thead><tbody>{leads.map((l) => <tr key={l.id}><td><Link className="text-brand-700" href={`/leads/${l.id}`}>{l.name}</Link></td><td>{l.phone}</td><td><span className="badge">{l.status}</span></td><td>{l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toLocaleString("en-IN") : "—"}</td></tr>)}</tbody></table> : <p className="text-slate-500">No leads assigned to you yet.</p>}</div>
      </>}
    </Shell>
  );
}
