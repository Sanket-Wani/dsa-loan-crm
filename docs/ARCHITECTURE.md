# Architecture — DSA Loan CRM

## Style
Modular monolith (Next.js App Router): presentation, API and domain helpers in one deployable. Modules: Auth/RBAC, Leads, Telecalling, Customers/Cases, Documents, Eligibility, Bank Operations, Register/Reports, Tasks/Notifications, Integrations. Split services only when a module's scaling or compliance needs justify it.

## Data model (Prisma / PostgreSQL)
User(employee, Role, employeeCode) · Lead (+ normalizedPhone/normalizedEmail for dedupe) · LeadAssignmentHistory · CallActivity · FollowUp · Meeting · Handover · Customer (unique normalized phone/email) · LoanCase (unique human code `DSA-YYYY-NNNN`) · LoanProduct (configurable catalogue) · DocumentRequirement (by product/bank/category/property/stage) · CaseDocument (status lifecycle, version, uploader/reviewer, rejection reason) · EligibilityAssessment (inputs/assumptions/results as JSON + reviewer decision) · Bank · BankApplication · BankQuery · Task · Notification · AuditLog · StatusHistory · CallAnalysisRecord.
A customer has many cases; a case has many bank applications, documents, tasks and assessments. History tables are append-only in practice.

## RBAC
Roles: SUPER_ADMIN, ADMIN, TELECALLER, BACK_OFFICE. `src/lib/rbac.ts` is the single permission matrix (pure, unit-tested). Every API route calls `requireUser(action)` and list/detail routes also apply scope/object checks (`leadScope`, `canAccessLead`, `caseScope`, `canAccessCase`). Only SUPER_ADMIN has `settings:manage` / can create other Super Admins.

## Security controls
bcrypt password hashing; httpOnly + SameSite session cookie (Secure in production); Zod validation everywhere; Prisma parameterised queries (no SQL injection surface); React escaping (no raw HTML rendering of user input); object-level authorization on every record access (anti-IDOR); validated upload type/size with private storage abstraction; secrets only via env vars; AuditLog for sensitive creates/updates/assignments/uploads; no bank credentials/OTPs stored; no real PII in seed/fixtures.

## Document storage (Milestone 2 — implemented)
`src/lib/storage.ts` defines a driver interface `put(key, Buffer) / get(key)`; API routes never touch the filesystem directly.
- **local driver**: writes under `STORAGE_DIR` (default `./storage`, outside `public/`, git-ignored). Keys are `<caseId>/<documentId>/<uuid>.<ext-from-mime>` — generated, decoupled from original names (kept only as DB metadata), so uploads can't traverse paths or collide. `resolveLocalPath()` rejects any key escaping the storage root.
- **Upload**: `POST /api/documents/upload` (multipart) validates type (PDF/JPEG/PNG/WebP) and size (≤10 MB), requires `documents:manage` + object-level case access, bumps `CaseDocument.version` on re-upload, marks the document RECEIVED, and writes an AuditLog entry.
- **Download**: `GET /api/documents/download?id=` re-checks the same permission + case access server-side and streams the file with `Content-Disposition: attachment` and `Cache-Control: private, no-store`. There is no public file URL.
- **S3 driver**: same interface for S3-compatible storage (`STORAGE_DRIVER=s3`, `S3_BUCKET/S3_REGION/S3_ENDPOINT/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY`). It is currently a stub that throws a descriptive "not configured" error — wire `@aws-sdk/client-s3` `PutObjectCommand`/`GetObjectCommand` there to enable it, keeping the bucket private and downloads proxied through the authenticated endpoint (or short-lived signed URLs issued only after the same access check). Required on serverless hosts (Vercel) where local disk is ephemeral.

## Import / export formats
Lead import accepts CSV (pasted text or file) and XLSX (multipart file or base64 JSON) — both converge on `validateImportRows()` (validation + phone/email duplicate detection + per-row report). The master register exports CSV by default and XLSX via `?format=xlsx` (`src/lib/xlsx.ts`, ExcelJS); both are generated from the same live register rows.

## Tasks & notifications UI
`/tasks` (list, status filter, create, mark done — backed by `/api/tasks` with role scoping: telecallers/back-office see their assigned tasks) and `/notifications` (backed by `/api/notifications`, which returns the user's in-app notifications + broadcasts and marks them read). Creating a task assigned to a user creates an IN_APP `Notification` row for them.

## Health
`GET /api/health` is public (exempted in middleware) and returns `{ status, db, timestamp }`, running `SELECT 1` against the database; 503 when the DB is unreachable. Suitable as a platform health-check target.

## Processing workflow
Case stages are data (`CaseStage` enum + configurable per product/bank in `LoanProduct.workflow` / requirements): PRE_REVIEW → DOCUMENT_COLLECTION → DOCUMENT_VERIFICATION → ELIGIBILITY → BANK_LOGIN → PD → LEGAL → VALUATION → CREDIT_ASSESSMENT → IN_PRINCIPLE_SANCTION → FINAL_SANCTION → PRE_DISBURSEMENT → DISBURSED → POST_SALES → CLOSED. Bank application statuses mirror the bank-side journey; updates are manual (no bank portal APIs are assumed).

## Future integration interfaces (foundations only)
- **Telephony**: log calls against `CallActivity`; a provider adapter would create the same records + a recording reference. Live transfer requires a real provider account — not faked.
- **AI call analysis**: `CallAnalysisRecord { externalCallRef, transcript, summary, extractedFields(JSON), status, provider }`. CRM works if the service is down (`NOT_CONFIGURED` default). Before integrating the existing call-analysis repo, review its licence, dependencies, API and deployment separately.
- **WhatsApp / Email / SMS**: `Notification { channel, status, scheduledAt, entity }` rows are created in-app (e.g. on task assignment). A worker + provider credentials (explicit authorisation required) would drain `PENDING` notifications later. Nothing is sent in this milestone.
- **Lead sources / future APIs**: leads carry `source`; import/API creation share the same validation + dedupe path.
