"use client";
import Shell from "@/components/Shell";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
interface Lead { id: string; name: string; phone: string; company?: string; city?: string; productCode?: string; requestedAmount?: number; source: string; status: string; assignedTo?: { name: string }; nextFollowUpAt?: string }
export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]); const [total, setTotal] = useState(0); const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]); const [assignee, setAssignee] = useState(""); const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: "50" }); if (q) params.set("q", q); if (status) params.set("status", status);
    const r = await fetch(`/api/leads?${params}`); const j = await r.json();
    if (r.ok) { setItems(j.items); setTotal(j.total); } else setError(j.error || "Failed to load");
    setLoading(false);
  }, [q, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/employees?pageSize=100").then((r) => (r.ok ? r.json() : null)).then((j) => j && setEmployees(j.items)).catch(() => null); }, []);
  async function bulkAssign() {
    if (!selected.length || !assignee) return;
    const r = await fetch("/api/leads/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadIds: selected, assignedToId: assignee }) });
    if (r.ok) { setSelected([]); load(); } else alert((await r.json()).error);
  }
  return (
    <Shell>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-2xl font-bold">Leads <span className="text-sm font-normal text-slate-500">({total})</span></h1>
        <div className="flex gap-2"><Link className="btn-secondary" href="/leads/import">Import CSV</Link><Link className="btn" href="/leads/new">New lead</Link></div>
      </div>
      <div className="card mb-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]"><label>Search</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, company…" /></div>
        <div><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{["NEW","UNASSIGNED","ASSIGNED","CONTACTED","FOLLOW_UP_REQUIRED","INTERESTED","QUALIFIED","MEETING_SCHEDULED","HANDED_OVER","NOT_INTERESTED","UNREACHABLE","DISQUALIFIED"].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Bulk assign to</label><select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Select employee…</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}</select></div>
        <button className="btn" onClick={bulkAssign} disabled={!selected.length || !assignee}>Assign {selected.length || ""}</button>
      </div>
      {error && <div className="card text-red-700 mb-3">{error}</div>}
      <div className="card overflow-x-auto">
        {loading ? <p>Loading…</p> : items.length === 0 ? <p className="text-slate-500">No leads found. Create one or import a CSV.</p> : (
          <table><thead><tr><th></th><th>Name</th><th>Phone</th><th>Company / City</th><th>Product</th><th>Amount</th><th>Source</th><th>Status</th><th>Assigned</th></tr></thead>
          <tbody>{items.map((l) => <tr key={l.id}>
            <td><input type="checkbox" className="w-auto" checked={selected.includes(l.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, l.id] : selected.filter((x) => x !== l.id))} /></td>
            <td><Link className="text-brand-700 font-medium" href={`/leads/${l.id}`}>{l.name}</Link></td><td>{l.phone}</td><td>{l.company || "-"} {l.city ? `· ${l.city}` : ""}</td><td>{l.productCode || "-"}</td><td>{l.requestedAmount ? `₹${l.requestedAmount.toLocaleString("en-IN")}` : "-"}</td><td>{l.source}</td><td><span className="badge">{l.status}</span></td><td>{l.assignedTo?.name || "—"}</td>
          </tr>)}</tbody></table>)}
      </div>
    </Shell>
  );
}
