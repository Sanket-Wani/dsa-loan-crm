import { NextResponse, type NextRequest } from "next/server";
// Lightweight edge guard: presence of the httpOnly session cookie.
// Real authorization is enforced server-side in every API route (RBAC + object-level).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico") return NextResponse.next();
  if (!req.cookies.get("dsa_session")) { const url = req.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url); }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
