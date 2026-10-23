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

## Processing workflow
Case stages are data (`CaseStage` enum + configurable per product/bank in `LoanProduct.workflow` / requirements): PRE_REVIEW → DOCUMENT_COLLECTION → DOCUMENT_VERIFICATION → ELIGIBILITY → BANK_LOGIN → PD → LEGAL → VALUATION → CREDIT_ASSESSMENT → IN_PRINCIPLE_SANCTION → FINAL_SANCTION → PRE_DISBURSEMENT → DISBURSED → POST_SALES → CLOSED. Bank application statuses mirror the bank-side journey; updates are manual (no bank portal APIs are assumed).

## Future integration interfaces (foundations only)
- **Telephony**: log calls against `CallActivity`; a provider adapter would create the same records + a recording reference. Live transfer requires a real provider account — not faked.
- **AI call analysis**: `CallAnalysisRecord { externalCallRef, transcript, summary, extractedFields(JSON), status, provider }`. CRM works if the service is down (`NOT_CONFIGURED` default). Before integrating the existing call-analysis repo, review its licence, dependencies, API and deployment separately.
- **WhatsApp / Email / SMS**: `Notification { channel, status, scheduledAt, entity }` rows are created in-app (e.g. on task assignment). A worker + provider credentials (explicit authorisation required) would drain `PENDING` notifications later. Nothing is sent in this milestone.
- **Lead sources / future APIs**: leads carry `source`; import/API creation share the same validation + dedupe path.
