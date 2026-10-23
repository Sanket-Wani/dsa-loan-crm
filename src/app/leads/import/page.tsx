"use client";
import Shell from "@/components/Shell";
import { useState } from "react";
interface Report { row: number; errors: string[]; duplicate: boolean }
export default function ImportPage() {
  const [csv, setCsv] = useState("name,phone,email,company,city,requested_amount,source,product_code\n");
  const [result, setResult] = useState<{ totalRows: number; imported: number; failed: number; report: Report[] } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (!f) return; setFile(f); if (f.name.toLowerCase().endsWith(".csv")) setCsv(await f.text()); }
  async function submit() {
    setBusy(true); setError("");
    let r: Response;
    if (file && file.name.toLowerCase().endsWith(".xlsx")) {
      const fd = new FormData(); fd.append("file", file);
      r = await fetch("/api/leads/import", { method: "POST", body: fd });
    } else {
      r = await fetch("/api/leads/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
    }
    const j = await r.json(); setBusy(false);
    if (r.ok) setResult(j); else setError(j.error || "Import failed");
  }
  return (
    <Shell><h1 className="text-2xl font-bold mb-4">Import leads (CSV / Excel)</h1>
      <div className="card space-y-3 max-w-4xl">
        <p className="text-sm text-slate-600">Headers: name, phone, email, company, city, requested_amount, source, product_code. Duplicates are detected by phone/email and reported per row — invalid rows are never silently imported. Excel (.xlsx) files are uploaded directly; CSV files can also be pasted below.</p>
        <div><label>CSV or Excel file</label><input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} /></div>
        <div><label>Or paste CSV</label><textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" /></div>
        {error && <div className="text-red-700 text-sm">{error}</div>}
        <button className="btn" onClick={submit} disabled={busy}>{busy ? "Importing…" : "Import"}</button>
      </div>
      {result && <div className="card mt-4 max-w-4xl">
        <h2 className="font-semibold">Import report</h2>
        <p className="text-sm mt-1">Total rows: {result.totalRows} · Imported: {result.imported} · Failed/skipped: {result.failed}</p>
        <table className="mt-2"><thead><tr><th>Row</th><th>Result</th></tr></thead><tbody>
          {result.report.map((r) => <tr key={r.row}><td>{r.row}</td><td>{r.errors.length ? <span className="text-red-700">{r.errors.join("; ")}</span> : <span className="text-emerald-700">Imported</span>}</td></tr>)}
        </tbody></table>
      </div>}
    </Shell>
  );
}
