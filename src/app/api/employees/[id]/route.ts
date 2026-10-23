import { prisma } from "@/lib/db";
import { requireUser, ok, err, audit } from "@/lib/api";
import { z } from "zod";
const patchSchema = z.object({ name: z.string().min(2).optional(), phone: z.string().nullable().optional(), role: z.enum(["SUPER_ADMIN","ADMIN","TELECALLER","BACK_OFFICE"]).optional(), isActive: z.boolean().optional() });
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await requireUser("employees:manage"); if ("response" in a) return a.response;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid payload");
  if (parsed.data.role === "SUPER_ADMIN" && a.user.role !== "SUPER_ADMIN") return err("Only Super Admin can promote to Super Admin", 403);
  const user = await prisma.user.update({ where: { id: params.id }, data: parsed.data });
  await audit(a.user.id, "EMPLOYEE_UPDATE", "User", user.id, parsed.data);
  return ok({ id: user.id, isActive: user.isActive, role: user.role });
}
