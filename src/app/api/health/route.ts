import { prisma } from "@/lib/db";

/** Liveness/readiness probe: reports app status and live DB connectivity. */
export async function GET() {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }
  return Response.json(
    { status: db === "ok" ? "ok" : "degraded", db, timestamp: new Date().toISOString() },
    { status: db === "ok" ? 200 : 503 },
  );
}
