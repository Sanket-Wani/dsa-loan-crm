#!/usr/bin/env node
/**
 * Vercel build entry point.
 *
 * Why this exists: `prisma generate` reads the datasource URL from the schema
 * (`env("DATABASE_URL")`). On a fresh Vercel project — before any hosted
 * database is attached and env vars are set — DATABASE_URL is unset, so
 * `prisma generate` cannot complete properly. The generated Prisma Client then
 * has degraded types and `next build` fails its type-check (observed as
 * implicit-`any` errors, e.g. in `src/app/api/notifications/route.ts`).
 *
 * `prisma generate` never opens a database connection — it only needs a
 * syntactically valid URL to generate the client. So when DATABASE_URL is
 * unset/empty, we substitute a clearly-labelled placeholder for the build
 * only. A real DATABASE_URL, when present, is passed through untouched.
 *
 * Migrations are intentionally NOT run here. `prisma migrate deploy` is a
 * separate release step, run once a real hosted DATABASE_URL exists:
 *   DATABASE_URL=<hosted-url> npx prisma migrate deploy
 * See the Deployment section of README.md.
 */
import { spawnSync } from "node:child_process";

const PLACEHOLDER_DATABASE_URL =
  "postgresql://build:build@localhost:5432/build";

const env = { ...process.env };
if (!env.DATABASE_URL || env.DATABASE_URL.trim() === "") {
  console.warn(
    "[vercel-build] DATABASE_URL is not set — using a placeholder URL so " +
      "`prisma generate` can run. Generate does not connect to a database. " +
      "A real DATABASE_URL is still required at runtime, and migrations must " +
      "be run separately once a hosted database exists."
  );
  env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
}

function run(label, command, args) {
  console.log(`[vercel-build] ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) {
    console.error(`[vercel-build] Failed to start ${label}:`, result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      `[vercel-build] ${label} failed with exit code ${result.status ?? "unknown (terminated by signal)"}.`
    );
    // Propagate the child's exit code, failing loudly.
    process.exit(result.status ?? 1);
  }
}

run("Prisma generate", "npx", ["prisma", "generate"]);
run("Next.js build", "npx", ["next", "build"]);

console.log("[vercel-build] Build completed successfully.");
