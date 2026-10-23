"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", dueAt: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/tasks${filter ? `?status=${filter}` : ""}`);
    const j = await r.json();
    if (r.ok) setTasks(Array.isArray(j) ? j : []);
    else setError(j.error || "Could not load tasks");
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.title) return;
    const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.title, description: form.description || undefined, priority: form.priority, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined }) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setForm({ title: "", description: "", priority: "MEDIUM", dueAt: "" });
    load();
  }
  async function setStatus(id: string, status: string) {
    await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {error && <div className="card text-red-700 mb-4">{error}</div>}
      <div className="card mb-4">
        <h2 className="font-semibold mb-2">New task</h2>
        <div className="grid md:grid-cols-5 gap-2">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}</select>
          <input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          <button className="btn" onClick={create}>Create task</button>
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <button className={!filter ? "btn" : "btn-secondary"} onClick={() => setFilter("")}>All</button>
        {STATUSES.map((s) => <button key={s} className={filter === s ? "btn" : "btn-secondary"} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      <div className="card">
        {tasks.length ? tasks.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 text-sm">
            <div>
              <b>{t.title}</b>{t.description ? <span className="text-slate-500"> — {t.description}</span> : null}
              <div className="text-xs text-slate-400">{t.priority}{t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString("en-IN")}` : ""}{t.caseId ? " · linked to a case" : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">{t.status}</span>
              {t.status !== "DONE" && <button className="btn-secondary" onClick={() => setStatus(t.id, "DONE")}>Mark done</button>}
              <select className="w-auto" value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
        )) : <p className="text-sm text-slate-500">No tasks{filter ? ` with status ${filter}` : ""} yet.</p>}
      </div>
    </Shell>
  );
}
