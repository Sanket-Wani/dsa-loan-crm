"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
interface Me { name: string; role: string; email: string }
const NAV = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/leads", label: "Leads" }, { href: "/telecaller", label: "Telecaller Queue" },
  { href: "/customers", label: "Customers" }, { href: "/cases", label: "Loan Cases" }, { href: "/register", label: "Master Register" },
  { href: "/admin/employees", label: "Employees" }, { href: "/admin/products", label: "Loan Products" },
];
export default function Shell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null); const router = useRouter();
  useEffect(() => { fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => null); }, []);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); }
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-brand-900 text-white p-4 hidden md:flex flex-col gap-1 shrink-0">
        <div className="font-bold text-lg mb-1">DSA Loan CRM</div>
        <div className="text-xs text-slate-300 mb-4">{me ? `${me.name} · ${me.role}` : "Loading…"}</div>
        {NAV.map((n) => <Link key={n.href} href={n.href} className="px-3 py-2 rounded-md hover:bg-white/10 text-sm">{n.label}</Link>)}
        <button onClick={logout} className="mt-auto text-left px-3 py-2 rounded-md hover:bg-white/10 text-sm">Log out</button>
      </aside>
      <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
        <div className="md:hidden flex gap-2 flex-wrap mb-4">{NAV.map((n) => <Link key={n.href} href={n.href} className="btn-secondary">{n.label}</Link>)}</div>
        {children}
      </main>
    </div>
  );
}
