import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role } from "./rbac";
export const SESSION_COOKIE = "dsa_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me-please-32chars");
export interface SessionUser { id: string; email: string; name: string; role: Role; employeeCode: string }
export async function hashPassword(p: string) { return bcrypt.hash(p, 12); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }
export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export function clearSession() { cookies().delete(SESSION_COOKIE); }
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload as unknown as SessionUser; } catch { return null; }
}
