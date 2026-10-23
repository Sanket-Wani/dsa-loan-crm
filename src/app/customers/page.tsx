"use client";
import Shell from "@/components/Shell";
import { useEffect, useState } from "react";
export default function CustomersPage() {
  const [items, setItems] = useState<any[]>([]); const [q, setQ] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); fetch(`/api/customers?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ""}`).then((r) => r.json()).then((j) => { setItems(j.items || []); setLoading(false); }); }, [q]);
  return (<Shell><h1 className="text-2xl font-bold mb-4">Customers</h1>
    <div className="card mb-3"><label>Search</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, company…" /></div>
    <div className="card overflow-x-auto">{loading ? <p>Loading…</p> : items.length ? <table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Company</th><th>City</th><th>Cases</th></tr></thead><tbody>{items.map((c) => <tr key={c.id}><td className="font-medium">{c.name}</td><td>{c.phone}</td><td>{c.email || "-"}</td><td>{c.company || "-"}</td><td>{c.city || "-"}</td><td>{c.cases?.length || 0}</td></tr>)}</tbody></table> : <p className="text-slate-500">No customers yet. Customers are created (deduplicated by phone/email) when a qualified lead becomes a loan case.</p>}</div>
  </Shell>);
}
