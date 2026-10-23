"use client";
import Shell from "@/components/Shell";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function CasesPage() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState("");
  useEffect(() => { fetch(`/api/cases?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ""}`).then((r) => r.json()).then((j) => { setItems(j.items || []); setLoading(false); }); }, [q]);
  return (<Shell><h1 className="text-2xl font-bold mb-4">Loan cases</h1>
    <div className="card mb-3"><label>Search by case code / customer</label><input value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="card overflow-x-auto">{loading ? <p>Loading…</p> : items.length ? <table><thead><tr><th>Code</th><th>Customer</th><th>Product</th><th>Amount</th><th>Stage</th><th>Status</th><th>Owner</th></tr></thead><tbody>{items.map((c) => <tr key={c.id}><td><Link className="text-brand-700 font-medium" href={`/cases/${c.id}`}>{c.code}</Link></td><td>{c.customer?.name}</td><td>{c.productCode || "-"}</td><td>{c.requestedAmount ? `₹${c.requestedAmount.toLocaleString("en-IN")}` : "-"}</td><td><span className="badge">{c.stage}</span></td><td>{c.status}</td><td>{c.owner?.name || "—"}</td></tr>)}</tbody></table> : <p className="text-slate-500">No cases yet.</p>}</div>
  </Shell>);
}
