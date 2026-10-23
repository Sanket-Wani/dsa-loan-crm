import { getSessionUser } from "@/lib/auth";
import { ok, err } from "@/lib/api";
export async function GET() { const u = await getSessionUser(); return u ? ok(u) : err("Unauthenticated", 401); }
