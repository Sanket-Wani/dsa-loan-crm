import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ok, err } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Invalid email or password format");
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive) return err("Invalid credentials", 401);
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return err("Invalid credentials", 401);
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role, employeeCode: user.employeeCode });
  return ok({ id: user.id, email: user.email, name: user.name, role: user.role, employeeCode: user.employeeCode });
}
