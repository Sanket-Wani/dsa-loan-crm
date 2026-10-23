# DSA Loan CRM

Production-oriented CRM and loan-operations platform for a DSA (Direct Selling Agent) business in India.
Covers the full lifecycle: lead acquisition → assignment → telecalling → qualification → follow-ups/meetings → handover → document collection/verification → eligibility → bank application/login → PD → legal/valuation → credit → in-principle sanction → final sanction → disbursement → post-sales.

> Status: **Milestone 3** — a genuine, database-backed working system (auth, RBAC, leads, telecalling, cases, real document file upload/download, eligibility, bank applications/queries, master register, tasks & notifications, dashboards), verified end-to-end against a live PostgreSQL 16 database (45/45 smoke checks — see below). Milestone 3 adds the fully implemented S3 document storage driver (for serverless hosts) and Vercel deployment preparation (`vercel-build` runs migrations at deploy time).

## Stack & rationale
- **Next.js 14 (App Router) + TypeScript** — one modular monolith: UI + API routes, low ops overhead, easy hiring/maintenance.
- **PostgreSQL + Prisma** — relational data (leads/cases/bank applications), committed migrations, transactions.
- **Custom session auth** — bcryptjs password hashing (cost 12), signed JWT in an httpOnly Secure cookie via `jose`. No bank passwords/OTPs are ever stored.
- **Server-side RBAC** — permission matrix in `src/lib/rbac.ts`, enforced in every API route plus object-level checks (telecallers only see assigned leads; back-office only own cases). Hiding a button is never the security boundary.
- **ExcelJS** — native `.xlsx` lead import and master-register export (CSV remains fully supported).
- **Zod** validation on API inputs · **Tailwind CSS** design system · **Vitest** unit tests · **ESLint**.

## Local setup
```bash
cp .env.example .env          # set DATABASE_URL and SESSION_SECRET (long random string)
docker compose up -d          # PostgreSQL 16 on localhost:5432 (or use any local/hosted Postgres)
npm install
npx prisma generate
npx prisma migrate deploy     # applies the committed migrations (prisma/migrations/)
npm run db:seed               # dev-only demo data
npm run build && npm run start   # http://localhost:3000  (or `npm run dev`)
```

### Dev-only seed logins (NEVER use in production)
| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@dev.local | SuperAdmin@123 |
| Admin | admin@dev.local | Admin@12345 |
| Telecaller | telecaller@dev.local | Telecaller@123 |
| Back Office | backoffice@dev.local | BackOffice@123 |

Seed also creates the 16 loan products (ML, BL, CL*, HL, LAP, CP*, OD, TL, LRD, CRF, URL, CF, UDF, IP, PP, LP — *CL/CP marked pending confirmation), 5 banks, and sample document requirements. No real customer data is used anywhere.

## Scripts
`npm run dev|build|start|lint` · `npm test` · `npm run db:migrate|db:seed|db:studio`

## Key modules
- `src/lib/rbac.ts` — permission matrix + object-level access (unit-tested).
- `src/lib/csv.ts`, `src/lib/duplicates.ts` — CSV import validation, per-row error report, phone/email duplicate detection.
- `src/lib/xlsx.ts` — XLSX lead parsing (converges on the same validation pipeline as CSV) and master-register XLSX generation.
- `src/lib/eligibility.ts` — transparent arithmetic on reviewer-supplied inputs only. **No bank policy/formula is invented**; thresholds are reviewer-configured, a human decides.
- `src/lib/storage.ts` — document storage abstraction with two drivers (see "Document storage" below).
- API: `/api/health`, `/api/leads` (+`/assign`, `/import` CSV/XLSX), `/api/calls`, `/api/followups` (`?when=overdue|upcoming`), `/api/meetings`, `/api/handovers`, `/api/customers`, `/api/cases`, `/api/documents` (+`/checklist`, `/upload` multipart binary, `/download` authenticated streaming, `/upload-metadata` legacy), `/api/eligibility`, `/api/banks`, `/api/bank-applications`, `/api/bank-queries`, `/api/tasks`, `/api/notifications`, `/api/register` (+`/export` CSV and `?format=xlsx`), `/api/dashboard`, `/api/employees`, `/api/products`.
- UI pages: Dashboard, Leads (+ detail, new, import), Telecaller Queue, Customers, Loan Cases (+ detail with documents/eligibility/bank apps), Master Register, **Tasks**, **Notifications**, Employees, Loan Products.
- Master register is derived live from `BankApplication ⋈ LoanCase ⋈ Customer/Bank` with the exact columns: Login Date, Company Name, Client Name, Product, Status, Bank Name, Bank Manager / Consultant, Office Sales, Employee Code, Reference / Telecaller, Remarks, Sanctioned Loan Amount, Disbursed Loan Amount.

## Document storage
`POST /api/documents/upload` (multipart: `documentId`, `file`) stores the **actual binary** via the storage driver:
- **local driver** (default): writes to `STORAGE_DIR` (default `./storage`) — a private directory outside `public/`, git-ignored. Stored file names are generated (UUID + extension from the validated MIME type), never the original name; the original name lives only as DB metadata. Re-uploading the same document increments its `version` and writes a fresh file. Allowed types: PDF/JPEG/PNG/WebP, max 10 MB.
- **Downloads** only via `GET /api/documents/download?id=…`, which requires authentication, the `documents:manage` permission and object-level access to the case, then streams the file with `Cache-Control: private, no-store`. Files are never publicly addressable.
- **s3 driver** (implemented, Milestone 3): set `STORAGE_DRIVER=s3` plus `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (optional, for S3-compatible providers like MinIO/R2), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Implemented in `src/lib/storage.ts` with `@aws-sdk/client-s3` (`PutObjectCommand`/`GetObjectCommand` by storage key), with the same safety properties as the local driver: generated keys only, traversal/malformed keys rejected, bucket kept private, downloads only via the authenticated endpoint. If required configuration is missing it fails loudly — it never silently falls back to local disk. Unit-tested with a mocked SDK client (no real bucket in CI). On serverless hosts (e.g. Vercel) the local driver cannot persist files, so use S3 there.

## Live smoke test (Milestone 2 — actually executed)
Run on 2026-10-23 against PostgreSQL 16 + the production build (`next start`), 45/45 checks passed:
unauthenticated API requests rejected (401) · superadmin login · employee (telecaller) creation · lead creation + assignment · telecaller sees assigned lead, gets 403 on unassigned lead and on admin endpoints, list is scoped · call logged, follow-up scheduled, lead marked QUALIFIED · case created from lead with unique code `DSA-2026-NNNN`, customer deduped on second case · document checklist auto-generated, document status updated · **real PDF upload → stored on disk → authenticated download returned byte-identical bytes**; unauthenticated download rejected; telecaller download 403; re-upload bumped version to 2 · bank application created, query raised and resolved, sanction + disbursement amounts set · master register contained the row with correct fields; dashboard metrics reflected the data · register XLSX export downloaded and re-opened as a valid workbook; CSV export still works · XLSX lead import worked · CSV import of 3 rows (valid / duplicate / invalid) returned `imported=1, failed=2` with per-row errors and the duplicate flagged · task created for a telecaller produced an in-app notification; task filter + mark-done worked · `/api/health` reported `db: ok`.

Bugs found by the smoke test and fixed: (1) middleware redirected unauthenticated API calls to the HTML login page — APIs now return 401 JSON and `/api/health` is public; (2) employee creation spread the plaintext `password` into the Prisma create (500 error) — the payload is now destructured and only the bcrypt hash is stored.

## Deployment (Vercel + hosted PostgreSQL)
1. Provision a hosted PostgreSQL (e.g. Neon, Supabase, Railway, RDS) and note its connection string.
2. In Vercel → Project → Settings → Environment Variables set:
   - `DATABASE_URL` = the hosted Postgres URL
   - `SESSION_SECRET` = a long random string (32+ chars)
   - `STORAGE_DRIVER` = `s3` plus the `S3_*` variables (Vercel's filesystem is ephemeral — local document storage will not persist); the S3 driver is implemented (see "Document storage" above) and needs only a private bucket + credentials. Alternatively deploy the app on a VM/container host where the local driver + a persistent `STORAGE_DIR` volume works.
3. Release steps: Vercel builds the app with the `vercel-build` script (`prisma generate && prisma migrate deploy && next build`), so migrations are applied against the hosted database (`DATABASE_URL`) at deploy time. Run `npm run db:seed` **only** for a first-time demo database (remove/rotate seed users before real use).
4. No `vercel.json` is included: the project is a standard Next.js app and Vercel's zero-config defaults (framework detection, `next build`, Node runtime for API routes) are exactly what it needs — a config file would only duplicate defaults. Add one only if you later need custom headers/rewrites/regions.
5. Put the app behind HTTPS (Vercel provides it); use managed Postgres backups/PITR; restrict DB network access (least privilege).

## Known limitations / next steps
- S3 storage driver is implemented and unit-tested with a mocked SDK client, but has not yet been exercised against a real provisioned bucket (no bucket/credentials exist in dev/CI yet); the local driver is fully working and smoke-tested.
- No live telephony, WhatsApp/Email/SMS sending, or AI call-analysis execution — only integration interfaces/foundations (`CallAnalysisRecord`, `Notification` models; see `docs/ARCHITECTURE.md`). Nothing external is sent and no third-party costs are incurred.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for modules, data model, RBAC and integration interfaces.
