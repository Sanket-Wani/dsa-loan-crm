"use client";
import Shell from "@/components/Shell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOAN_PRODUCTS } from "@/lib/products";
export default function NewLead() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", city: "", productCode: "", requestedAmount: "", source: "MANUAL", remarks: "" });
  const [msg, setMsg] = useState(""); const router = useRouter();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, email: form.email || null, requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : null, productCode: form.productCode || null }) });
    const j = await r.json();
    if (r.ok) { if (j.duplicateWarning) setMsg(j.duplicateWarning + " — lead still created."); else router.push("/leads"); } else setMsg(j.error || "Failed");
  }
  return (
    <Shell><h1 className="text-2xl font-bold mb-4">New lead</h1>
      <form onSubmit={submit} className="card grid md:grid-cols-2 gap-4 max-w-3xl">
        <div><label>Name *</label><input required value={form.name} onChange={set("name")} /></div>
        <div><label>Phone *</label><input required value={form.phone} onChange={set("phone")} placeholder="10-digit mobile" /></div>
        <div><label>Email</label><input value={form.email} onChange={set("email")} /></div>
        <div><label>Company</label><input value={form.company} onChange={set("company")} /></div>
        <div><label>City</label><input value={form.city} onChange={set("city")} /></div>
        <div><label>Product</label><select value={form.productCode} onChange={set("productCode")}><option value="">Select…</option>{LOAN_PRODUCTS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}{p.pendingConfirmation ? " (pending confirmation)" : ""}</option>)}</select></div>
        <div><label>Requested amount (₹)</label><input type="number" value={form.requestedAmount} onChange={set("requestedAmount")} /></div>
        <div><label>Source</label><input value={form.source} onChange={set("source")} /></div>
        <div className="md:col-span-2"><label>Remarks</label><input value={form.remarks} onChange={set("remarks")} /></div>
        {msg && <div className="md:col-span-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{msg}</div>}
        <button className="btn md:col-span-2 justify-center">Create lead</button>
      </form></Shell>
  );
}
