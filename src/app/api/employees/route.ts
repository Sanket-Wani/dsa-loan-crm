import { prisma } from "@/lib/db";
import { requireUser, ok, err, pagination, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { employeeCreateSchema } from "@/lib/validation";
export async function GET(req: Request) {
  const a = await requireUser("employees:read"); if ("response" in a) return a.response;
  const { page, pageSize, skip, take, searchParams } = pagination(req);
  const q = searchParams.get("q") || "";
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { employeeCode: { contains: q } }] } : {};
  const [total, items] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: { id: true, email: true, name: true, phone: true, role: true, employeeCode: true, isActive: true, createdAt: true } })]);
  return ok({ items, total, page, pageSize });
}
export async function POST(req: Request) {
  const a = await requireUser("employees:manage"); if ("response" in a) return a.response;
  const parsed = employeeCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(parsed.error.issues.map((i) => i.message).join("; "));
  if (parsed.data.role === "SUPER_ADMIN" && a.user.role !== "SUPER_ADMIN") return err("Only Super Admin can create a Super Admin", 403);
  // Never spread the raw payload into Prisma: it contains the plaintext
  // `password`, which is not a User column (Prisma rejects it) and must only
  // ever be stored as passwordHash.
  const { password: _pw, ...profile } = parsed.data;
  const user = await prisma.user.create({ data: { ...profile, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone ?? undefined, passwordHash: await hashPassword(parsed.data.password) } });
  await audit(a.user.id, "EMPLOYEE_CREATE", "User", user.id, { role: user.role });
  return ok({ id: user.id, email: user.email, role: user.role, employeeCode: user.employeeCode }, 201);
}
