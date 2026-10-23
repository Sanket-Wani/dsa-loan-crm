"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";
export default function ProductsPage() {
  const [items, setItems] = useState<any[]>([]); const [error, setError] = useState("");
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const load = useCallback(async () => { const r = await fetch("/api/products"); const j = await r.json(); if (r.ok) setItems(j); else setError(j.error); }, []);
  useEffect(() => { load(); }, [load]);
  async function create(e: React.FormEvent) { e.preventDefault(); const r = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (r.ok) { setForm({ code: "", name: "", description: "" }); load(); } else alert((await r.json()).error); }
  async function toggle(p: any) { await fetch("/api/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, isActive: !p.isActive }) }); load(); }
  return (<Shell><h1 className="text-2xl font-bold mb-4">Loan products</h1>
    {error && <div className="card text-red-700 mb-3">{error}</div>}
    <form onSubmit={create} className="card grid md:grid-cols-4 gap-3 mb-4">
      <div><label>Code</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. PL" /></div>
      <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="flex items-end"><button className="btn w-full justify-center">Add product</button></div>
    </form>
    <div className="card overflow-x-auto"><table><thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Active</th><th></th></tr></thead><tbody>{items.map((p) => <tr key={p.id}><td className="font-bold">{p.code}</td><td>{p.name}</td><td>{p.pendingConfirmation ? <span className="badge bg-amber-100 text-amber-800">Pending confirmation</span> : <span className="badge">Confirmed</span>}</td><td>{p.isActive ? "Yes" : "No"}</td><td><button className="btn-secondary" onClick={() => toggle(p)}>{p.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
  </Shell>);
}
