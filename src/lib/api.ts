import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { can, type Action } from "./rbac";
export function ok(data: unknown, status = 200) { return NextResponse.json(data, { status }); }
export function err(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function requireUser(action?: Action): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: err("Unauthenticated", 401) };
  if (action && !can(user.role, action)) return { response: err("Forbidden", 403) };
  return { user };
}
export function pagination(req: Request) {
  const u = new URL(req.url);
  const page = Math.max(1, Number(u.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(u.searchParams.get("pageSize") || 20)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, searchParams: u.searchParams };
}
export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, details?: unknown) {
  try {
    const { prisma } = await import("./db");
    await prisma.auditLog.create({ data: { actorId: actorId ?? undefined, action, entity, entityId, details: (details as object) ?? undefined } });
  } catch { /* audit must never break the primary operation in dev */ }
}
