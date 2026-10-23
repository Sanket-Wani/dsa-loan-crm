"use client";
import Shell from "@/components/Shell";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function RegisterPage() {
  const [data, setData] = useState<{ columns: string[]; items: any[]; total: number } | null>(null); const [q, setQ] = useState(""); const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/register?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ""}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; }).then(setData).catch((e) => setError(e.message)); }, [q]);
  return (<Shell>
    <div className="flex justify-between flex-wrap gap-2 mb-4"><h1 className="text-2xl font-bold">Master Loan Register</h1><span className="flex gap-2"><a className="btn" href="/api/register/export">Export CSV</a><a className="btn-secondary" href="/api/register/export?format=xlsx">Export Excel (.xlsx)</a></span></div>
    <div className="card mb-3"><label>Search register</label><input value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {error && <div className="card text-red-700">{error}</div>}
    <div className="card overflow-x-auto">{!data ? <p>Loading…</p> : data.items.length ? <table><thead><tr>{data.columns.map((col) => <th key={col}>{col}</th>)}<th>Case</th></tr></thead><tbody>{data.items.map((r) => <tr key={r.id}>{data.columns.map((col) => <td key={col}>{typeof r[col] === "number" ? `₹${r[col].toLocaleString("en-IN")}` : r[col] || "-"}</td>)}<td><Link className="text-brand-700" href={`/cases/${r.caseId}`}>{r.caseCode}</Link></td></tr>)}</tbody></table> : <p className="text-slate-500">No bank applications yet — the register is built live from bank application + case records.</p>}</div>
  </Shell>);
}
