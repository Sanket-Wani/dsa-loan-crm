"use client";
import Shell from "@/components/Shell";
import { useEffect, useState, useCallback } from "react";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/notifications");
    const j = await r.json();
    if (r.ok) { setItems(j.items || []); setUnread(j.unread || 0); }
    else setError(j.error || "Could not load notifications");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-4">Notifications {unread ? <span className="badge">{unread} unread</span> : null}</h1>
      {error && <div className="card text-red-700 mb-4">{error}</div>}
      <div className="card">
        {items.length ? items.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 text-sm">
            <div>
              <b>{n.title}</b>
              {n.body ? <div className="text-slate-500">{n.body}</div> : null}
              <div className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("en-IN")} · {n.channel}</div>
            </div>
            {n.status === "PENDING" ? <button className="btn-secondary" onClick={() => markRead(n.id)}>Mark read</button> : <span className="badge">Read</span>}
          </div>
        )) : <p className="text-sm text-slate-500">No notifications yet. New task assignments and reminders will appear here.</p>}
      </div>
    </Shell>
  );
}
