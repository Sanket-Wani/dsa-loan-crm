"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";
export default function EmployeesPage() {
  const [items, setItems] = useState<any[]>([]); const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "TELECALLER", employeeCode: "" });
  const load = useCallback(async () => { const r = await fetch("/api/employees?pageSize=100"); const j = await r.json(); if (r.ok) setItems(j.items); else setError(j.error); }, []);
  useEffect(() => { load(); }, [load]);
  async function create(e: React.FormEvent) { e.preventDefault(); const r = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); if (r.ok) { setForm({ name: "", email: "", phone: "", password: "", role: "TELECALLER", employeeCode: "" }); load(); } else alert((await r.json()).error); }
  async function toggle(u: any) { await fetch(`/api/employees/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) }); load(); }
  return (<Shell><h1 className="text-2xl font-bold mb-4">Employees</h1>
    {error && <div className="card text-red-700 mb-3">{error} — employee management requires Admin / Super Admin.</div>}
    <form onSubmit={create} className="card grid md:grid-cols-3 gap-3 mb-4">
      <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label>Email</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label>Employee code</label><input required value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></div>
      <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><label>Temporary password (min 8)</label><input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
      <div><label>Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{["TELECALLER","BACK_OFFICE","ADMIN","SUPER_ADMIN"].map((r) => <option key={r}>{r}</option>)}</select></div>
      <button className="btn md:col-span-3 justify-center">Create employee</button>
    </form>
    <div className="card overflow-x-auto"><table><thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>{items.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.employeeCode}</td><td><span className="badge">{u.role}</span></td><td>{u.isActive ? "Yes" : "No"}</td><td><button className="btn-secondary" onClick={() => toggle(u)}>{u.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
  </Shell>);
}
