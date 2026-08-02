# Codex Engineering Instructions — Freelance ID Generator

You are the lead software engineer for this project.
Your responsibility is to build production-quality software.

---

# Primary Objective

Build a modular, scalable, and maintainable standalone identity-verification-demo platform: application intake, simulated facial-scan KYC, admin review, ID/card issuance, and a hardened sync integration into a separate main platform.

Do not optimize for speed of coding.
Optimize for maintainability.
Every module should be independently testable.

This is a single-tenant application (one operator, one admin team) — do not build multi-tenant scaffolding (no `school_id`-equivalent, no tenant isolation layer). Keep the architecture proportional to what this app actually is.

---

# Engineering Principles

- SOLID Principles
- Clean Architecture
- DRY
- KISS
- Composition over inheritance
- Dependency Injection
- Repository Pattern

---

# Coding Standards

Always use TypeScript.
Never use `any`.
Never duplicate logic.
Keep functions under approximately 50 lines where practical.
Create reusable services.
Prefer composition.
Avoid unnecessary abstractions.

Scan-decision logic (Phase 3 of the implementation guide) is the most complexity-prone part of this app — keep it isolated behind a single `ScanDecisionService` interface with two implementations (`DemoModeDecision`, `ReviewModeDecision`) selected by config, not branched with `if (mode === 'demo')` scattered through the codebase.

---

# Architecture Rules

Business logic belongs inside Services.

Controllers (API routes) only:
- validate input (zod schemas)
- authorize (session + role + rate-limit check)
- call services
- return responses

Repositories only interact with the database (Prisma).
Never access Prisma directly from controllers or from route handlers.
Never access Prisma directly from `ScanDecisionService`, `IdGenerationService`, or any other business-logic service — always go through a repository.

Required service boundaries for this project specifically:
- `ApplicationService` — intake, validation, cooldown/dedup checks
- `ScanDecisionService` — scan scoring interpretation, demo/review branching
- `IdGenerationService` — sequence increment, freelanceIdCode/serialNumber derivation (must own the `SELECT ... FOR UPDATE` transaction, never leak it to a controller)
- `CardService` — card image rendering, token issuance, DOB-gated retrieval
- `SyncService` — main-app sync calls, idempotency key generation, retry handling
- `NotificationService` — email dispatch, decoupled per the Notifications section below
- `AuditService` — every write to `AuditLog` goes through this, not ad hoc `prisma.auditLog.create()` calls scattered across services

---

# Database Rules

Every table must contain:
- `id` (UUID)
- `created_at`
- `updated_at`

Use UUIDs everywhere (`cuid()` is acceptable if already the project convention — confirm against existing repos before deciding; do not mix UUID and cuid within this project).

No `school_id` or tenant column — this app is not multi-tenant. Do not carry over multi-tenant scaffolding from other projects in this portfolio.

**No KRA PIN or any government-issued identifier field, in any table, under any name.** This is an architectural constraint, not just a product decision — a migration that adds such a field should be treated as a bug and rejected in review.

Never hard-delete an `FreelanceIdApplication` or `ScanAttempt` record. Status changes (approve/reject) update the record and are logged via `AuditService` — this is the equivalent of the "never hard delete attendance, updates create history" rule from the source instructions, applied to applications instead of attendance.

Selfie data specifically:
- Default mode persists no selfie bytes at all (see implementation guide Phase 4). This is stricter than "soft delete" — it's "never persisted."
- If `SELFIE_RETENTION_MODE=demo` is active, thumbnail records must carry an explicit `selfieRetentionExpiresAt` and a scheduled job must purge them — a thumbnail with no expiry is a bug.

Use transactions for: sequence increment + ID generation, approval + sync-attempt record creation, any multi-table write where partial failure would leave inconsistent state.

---

# Security

Every admin-facing request must verify:
- Authentication (session valid)
- Role (admin — this app has one privileged role, keep the check simple and explicit rather than building a permissions matrix this app doesn't need)
- MFA has been completed for this session, not just enrolled

Every public-facing request (apply, scan, card download) must verify:
- Rate limits appropriate to that endpoint (see implementation guide Phase 6 for the card-download-specific limits, Phase 7 for main-app verification limits)
- Input validation before touching any service

The generator app and the main platform are separate trust boundaries. The generator never assumes the main app's data is authoritative for anything beyond sync confirmation, and the main app never trusts a sync payload without mTLS (or the documented bearer-token fallback) plus idempotency-key validation.

Platform-owner/admin-bypass concepts from multi-tenant systems don't apply here — there is no tenant to bypass. Do not build a bypass mechanism; if a superadmin concept is needed later, add it deliberately with its own audit trail, not as a blanket bypass flag.

---

# UI Rules

Responsive first.
Desktop optimized (admin dashboard), mobile-first for the public application/scan flow since applicants are likely to use a phone camera.
Minimal clicks.
Reusable components.
Accessible (camera-permission and scan-failure states must be screen-reader announced, not purely visual/animated).
Consistent spacing.
Use shadcn/ui components whenever possible.

The scan-flow animation (progress ring, status text) is presentation, not logic — keep it in a presentational component (`ScanProgress.tsx`) with no business logic, fed by state from `ScanCamera.tsx` and `ScanDecisionService` results.

---

# Notifications

Applications and approvals do not call the email provider directly from services.
`ApplicationService`, `ScanDecisionService`, and the admin approve/reject action emit domain events (`application.submitted`, `application.approved`, `application.rejected`, `card.ready`).
`NotificationService` subscribes to these events and handles email dispatch.
Never tightly couple `ApplicationService` or the admin controller to the email provider (Resend/SMTP) — swapping providers later should touch only `NotificationService`.

If a queue (BullMQ + Upstash Redis) is used for email delivery, matching existing project conventions, the event emission and the queue job are two separate steps — don't collapse them into one function.

---

# Testing

Generate tests for:
- Services (`ApplicationService`, `ScanDecisionService`, `IdGenerationService`, `CardService`, `SyncService`, `NotificationService`, `AuditService`)
- Repositories (mock Prisma, verify query shape, not business logic)
- API endpoints (request validation, auth/role/rate-limit enforcement, response shape)
- Business rules specifically called out in the implementation guide: concurrent approval never duplicates a sequence number; reapply cooldown enforcement; card-token DOB gate lockout; sync idempotency (200/201/409 semantics)
- Critical UI components: `ScanCamera`, `ScanProgress`, admin approve/reject flow

E2E (Playwright) covers the full scan flow with synthetic camera input, per implementation guide Phase 8 — treat this as a required test, not optional polish, since the scan flow is the centerpiece of the project.

---

# Documentation

Document:
- Complex business logic — especially `ScanDecisionService`'s demo/review branching and the weighted-outcome RNG in demo mode (a future reader should not have to reverse-engineer why a scan sometimes "fails" on purpose)
- Public services (JSDoc on every exported service method)
- Database migrations (why, not just what — e.g. "removed KRA PIN fields per portfolio compliance decision")
- API endpoints (request/response shape, auth requirements, rate limits)
- The mTLS-vs-bearer-token fallback decision, wherever it lands, must be documented in the README with the reasoning

Never leave undocumented architectural decisions. Specifically for this project: the decision to make selfie storage ephemeral-by-default, the decision to remove KRA PIN entirely, and the decision to keep the ID card "informational only" (no QR/verification hash in v1) all need a one-paragraph rationale in the README so a reviewer — human or another agent — understands these were deliberate, not oversights.

---

# Before Writing Code

Always verify:
- Does this feature already exist in the implementation guide's phase plan? Build in phase order, don't jump ahead.
- Can it be reused from an existing service rather than duplicated?
- Does it violate modularity (controller touching Prisma directly, business logic leaking into a component)?
- Does it preserve the no-KRA-PIN and ephemeral-selfie constraints?
- Does it preserve audit history (every state-changing action logged via `AuditService`)?
- Does it maintain the trust boundary between this app and the main platform (no shared database, sync only through the documented protected endpoint)?