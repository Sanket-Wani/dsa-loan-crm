import { prisma } from "@/lib/db";
import { requireUser, ok, err } from "@/lib/api";
import { z } from "zod";

/** In-app notifications for the signed-in user (their own + broadcasts where userId is null). */
export async function GET() {
  const a = await requireUser(); if ("response" in a) return a.response;
  const items = await prisma.notification.findMany({
    where: { channel: "IN_APP", OR: [{ userId: a.user.id }, { userId: null }] },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return ok({ items, unread: items.filter((n) => n.status === "PENDING").length });
}

const patch = z.object({ id: z.string() });
/** Mark one of the user's notifications as read (status SENT is used as the acknowledged/read state for in-app items). */
export async function PATCH(req: Request) {
  const a = await requireUser(); if ("response" in a) return a.response;
  const p = patch.safeParse(await req.json().catch(() => null)); if (!p.success) return err("id is required");
  const n = await prisma.notification.findUnique({ where: { id: p.data.id } });
  if (!n || (n.userId && n.userId !== a.user.id)) return err("Notification not found", 404);
  return ok(await prisma.notification.update({ where: { id: n.id }, data: { status: "SENT", sentAt: new Date() } }));
}
