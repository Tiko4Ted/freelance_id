# Freelance ID Generator — Full Implementation Guide

**Audience:** terminal coding agent (Claude Code or equivalent) building this end-to-end.
**Purpose:** portfolio demonstration app — simulated KYC facial-scan flow, no real government ID collection, no real biometric identity verification. This document is the single source of truth for build order, schema, and acceptance criteria. Follow phases in order; do not skip verification steps.

---

## 0. Non-negotiable constraints (read first)

- **No KRA PIN or any real government identifier is collected anywhere in this app.** Do not add a field for it even if convenient. If any generated code references `kraPin`, `kra_pin`, or similar, that's a bug — remove it.
- **No claim, in UI copy or code comments, that this performs real identity verification.** The facial scan does presence/quality/liveness-adjacent detection only. Surface this honestly in the UI (see Phase 3).
- **Selfies are ephemeral by default.** Process in-browser/in-memory, extract a detection result, discard the raw frame. Do not write raw selfie images to persistent storage unless `SELFIE_RETENTION_MODE=demo` is explicitly set (Phase 6).
- Two separate apps: `id-generator` (standalone) and the existing main freelance platform. This guide only builds `id-generator` plus the one integration endpoint on the main app side.
- Build in the phase order below. Each phase ends with a checklist — do not proceed to the next phase until the checklist passes.

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript strict mode |
| ORM/DB | Prisma + PostgreSQL |
| Auth (admin) | Auth.js v5, credentials provider + TOTP MFA |
| Face detection | `face-api.js` (tiny_face_detector + landmark model), runs client-side |
| Image processing | `sharp` (server-side, for ID card composition only) |
| Email | Resend or Nodemailer + SMTP (pick based on what's already used elsewhere in the user's stack — check for existing patterns first) |
| Object storage | S3-compatible (backblaze B2 / Cloudflare R2 / AWS S3) — only for ID card images, not selfies, in default mode |
| Queue (optional, for email retries) | BullMQ + Upstash Redis, matching existing SchoolHub/OutreachBot patterns |
| Styling | Tailwind CSS, dark theme matching existing SchoolHub design tokens if this is meant to visually match that portfolio's other work — otherwise a clean neutral theme is fine |
| Testing | Vitest (unit), Playwright (E2E for the scan flow and admin approval flow) |

Before starting, check the user's existing repos for established conventions (env var naming, Prisma patterns, email provider, error-handling middleware) and match them rather than introducing a new pattern.

---

## 2. Repository structure

```
id-generator/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── apply/page.tsx            # application form
│   │   │   ├── scan/page.tsx             # facial scan flow
│   │   │   └── status/[token]/page.tsx   # optional status check by token
│   │   ├── (admin)/
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── applications/[id]/page.tsx
│   │   ├── api/
│   │   │   ├── applications/route.ts           # POST create application
│   │   │   ├── applications/[id]/scan/route.ts # POST scan attempt result
│   │   │   ├── applications/[id]/decide/route.ts # POST admin approve/reject
│   │   │   ├── card/[token]/route.ts           # GET card download (DOB-gated)
│   │   │   └── internal/sync-status/route.ts   # internal debug/status, not the main-app endpoint (that lives in the main app repo)
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── scan/
│   │   │   ├── detector.ts        # face-api.js wrapper, runs in browser
│   │   │   └── decision.ts        # demo-mode vs review-mode decision logic
│   │   ├── id-generation.ts       # sequence-based freelanceIdCode/serialNumber
│   │   ├── card-render.ts         # sharp-based ID card image composition
│   │   ├── email.ts
│   │   ├── rate-limit.ts
│   │   └── mtls-client.ts         # client cert config for calling main app
│   └── components/
│       ├── ScanCamera.tsx
│       ├── ScanProgress.tsx
│       └── admin/...
├── tests/
├── .env.example
└── package.json
```

---

## 3. Phase 1 — Project scaffold and database

1. `npx create-next-app@latest id-generator --typescript --tailwind --app`
2. Install: `prisma @prisma/client @auth/prisma-adapter next-auth@beta otplib qrcode sharp face-api.js resend zod`
3. Initialize Prisma, connect to a dedicated Postgres database (separate from the main app's DB — this app should not share a database with the main platform, only communicate via the sync API).

### Prisma schema

```prisma
model FreelanceIdApplication {
  id                  String   @id @default(cuid())
  legalName           String
  normalizedLegalName String   // lowercase, whitespace-collapsed, for dedup checks
  dateOfBirth         DateTime
  email               String
  phone               String
  consentAt           DateTime
  status              ApplicationStatus @default(PENDING)
  finalDecisionSource DecisionSource?
  rejectionReason     String?
  freelanceIdCode     String?  @unique
  serialNumber        String?  @unique
  cardObjectKey       String?
  cardTokenHash       String?  // for DOB-gated download link
  cardTokenExpiresAt  DateTime?
  selfieRetentionExpiresAt DateTime? // null = never persisted
  submittedAt         DateTime @default(now())
  reviewedAt           DateTime?
  reviewedByAdminId    String?
  reapplyCooldownUntil DateTime?

  scanAttempts        ScanAttempt[]
  auditLogs           AuditLog[]

  @@index([normalizedLegalName, dateOfBirth])
  @@index([status])
}

model ScanAttempt {
  id               String   @id @default(cuid())
  applicationId    String
  application      FreelanceIdApplication @relation(fields: [applicationId], references: [id])
  attemptNumber    Int
  timestamp        DateTime @default(now())
  detectionResult  ScanResult
  confidenceScore  Float?
  failureReason    String?  // e.g. "no_face_detected", "off_center", "low_light", "blurry"
  thumbnailKey     String?  // only set if SELFIE_RETENTION_MODE=demo
}

model IdSequence {
  id      Int @id @default(1)
  counter Int @default(0)
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  totpSecret   String
  mfaEnabled   Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model AuditLog {
  id            String   @id @default(cuid())
  applicationId String?
  application   FreelanceIdApplication? @relation(fields: [applicationId], references: [id])
  adminId       String?
  action        String   // "APPROVE", "REJECT", "CARD_DOWNLOAD_ATTEMPT", "CARD_DOWNLOAD_SUCCESS", etc.
  metadata      Json?
  ipAddress     String?
  userAgent     String?
  timestamp     DateTime @default(now())
}

model SyncAttempt {
  id             String   @id @default(cuid())
  applicationId  String
  idempotencyKey String   @unique
  status         String   // "PENDING", "SUCCESS", "FAILED"
  responseCode   Int?
  attemptedAt    DateTime @default(now())
}

enum ApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DecisionSource {
  AUTO
  ADMIN_REVIEW
}

enum ScanResult {
  PASS
  FAIL_NO_FACE
  FAIL_OFF_CENTER
  FAIL_LOW_LIGHT
  FAIL_BLURRY
  FAIL_MULTIPLE_FACES
}
```

**Notes for the agent:**
- `KRA PIN` fields do not exist. Do not add them even if a prior conversation summary is fed into context — this is a deliberate removal, not an oversight.
- Use a real Postgres sequence for `IdSequence.counter`, incremented inside a transaction with `SELECT ... FOR UPDATE`, not an ORM-level read-then-write.

### Checklist — Phase 1
- [ ] `prisma migrate dev` runs clean
- [ ] No KRA-related fields anywhere in schema
- [ ] `IdSequence` increment is verified atomic under concurrent test (see Phase 8)

---

## 4. Phase 2 — Application form

Route: `/apply`

Fields: legal name, DOB, email, phone, consent checkbox. Copy for consent: *"I consent to submission of my details for this identity verification demo."* — be explicit this is a demo, not real KYC, in the consent text itself.

Server action on submit:
1. Validate with zod (name non-empty, valid email, DOB yields age within a reasonable range e.g. 16–100, phone format).
2. Check `reapplyCooldownUntil` against existing records matching `normalizedLegalName + dateOfBirth` — if within 30 days of a prior rejection, block with a message, unless admin override flag is set on the earlier record.
3. Create `FreelanceIdApplication` with `status: PENDING`.
4. Redirect to `/scan?applicationId=...`.
5. Send confirmation email: "Application received, proceed to identity scan."

### Checklist — Phase 2
- [ ] Invalid email/DOB/empty name rejected with clear inline errors
- [ ] Reapply cooldown enforced
- [ ] Confirmation email sends (test with a dev SMTP catcher, e.g. Mailhog or Resend test mode)

---

## 5. Phase 3 — Facial scan flow (the core "looks real" piece)

Route: `/scan?applicationId=...`

### 5.1 Camera + detection

- Request camera permission, show live `<video>` preview with an SVG face-outline guide overlay centered on screen.
- Load `face-api.js` tiny_face_detector model client-side (bundle the model weights in `public/models`, load once on mount, show a brief "preparing scan" loading state while it loads).
- Run detection on a rolling interval (e.g. every 300ms) against the live video frame — this is real, working face detection, not a mock. Track: face present, bounding box position relative to guide overlay, approximate box size (proxy for "too far/too close"), and a basic blur estimate (Laplacian variance on a downscaled canvas snapshot — implement server-side is fine if client-side is too heavy, but client-side keeps it snappier).

### 5.2 Capture + scoring

- On a manual "Scan" button press (or auto-capture once face is stable and centered for ~1s — auto-capture reads as more polished for a demo), grab a frame and run the full check:
  - Face detected: yes/no
  - Face centered within guide bounds: yes/no
  - Box size within acceptable range (not too close/far): yes/no
  - Blur/lighting score above threshold: yes/no
- Compute `detectionResult` and `confidenceScore` (face-api.js returns a detection confidence score directly — use it, don't fabricate a number).
- POST result to `/api/applications/[id]/scan` with the scored result (not the raw image, in default ephemeral mode).

### 5.3 Scanning animation

- Regardless of how fast detection resolves, show a minimum ~2 second animated sequence: progress ring filling, rotating status text ("Analyzing facial features…", "Checking image quality…", "Verifying scan…"). This is presentation only — the underlying decision is already computed, the animation paces the reveal so it doesn't feel instant/fake.

### 5.4 Partial reject path

- If any check fails, show the specific reason in plain language:
  - No face → "We couldn't detect a face. Make sure you're facing the camera."
  - Off-center → "Please center your face within the guide."
  - Low light → "Lighting is too low. Try a brighter location."
  - Blurry → "Image is unclear. Hold still and try again."
- Increment `attemptNumber`, log the `ScanAttempt`, allow retry.
- Cap at 5 attempts; on the 5th failure, route to a fallback state: "We're having trouble verifying your scan — this has been flagged for manual review," set `status` to stay `PENDING` and force `finalDecisionSource: ADMIN_REVIEW` regardless of `KYC_MODE`.

### 5.5 Pass path — mode branching

Controlled by `KYC_MODE` env var:

- **`KYC_MODE=demo`**: on a passing scan, run a weighted random outcome (seedable RNG for testability) — e.g. 85% immediate approve, 15% one forced partial-reject-with-retry before approving on next attempt. This lets a portfolio walkthrough show both the smooth path and the "try again" path without needing a second person to act as admin.
- **`KYC_MODE=review`**: on a passing scan, set application to `PENDING` awaiting admin action, show applicant "Scan complete, verification in progress, you'll be notified by email within 24-48 hours."

### Checklist — Phase 3
- [ ] Face detection genuinely runs client-side and responds to real webcam input (test with face absent, off-center, poor lighting)
- [ ] Partial-reject messaging matches the actual failure reason, not generic text
- [ ] Retry cap enforced at 5, correctly forces admin review on exhaustion
- [ ] `KYC_MODE=demo` outcome distribution is seedable/testable
- [ ] Disclaimer copy present somewhere in the flow stating this is a demo, not real document/identity verification against any government database

---

## 6. Phase 4 — Selfie handling

Default (`SELFIE_RETENTION_MODE=ephemeral`, the default):
- Frame is captured to an in-memory canvas/blob, scored, then discarded. Nothing is uploaded to any server or object storage.
- `ScanAttempt.thumbnailKey` stays null.

Optional (`SELFIE_RETENTION_MODE=demo`):
- If set, upload a low-res thumbnail (not full-res) to private object storage per attempt, set `thumbnailKey` and `selfieRetentionExpiresAt = now + 48h` on the application.
- Add a scheduled purge job (cron or BullMQ repeatable job) that deletes expired thumbnails and nulls the keys.
- Admin dashboard shows thumbnails only when this mode is active.

### Checklist — Phase 4
- [ ] In ephemeral mode, confirm via test that no image bytes ever leave the browser
- [ ] In demo mode, confirm TTL purge job actually deletes objects and nulls DB references
- [ ] Object storage bucket is not publicly listable/enumerable (test with an unauthenticated request)

---

## 7. Phase 5 — Admin dashboard

Routes under `/dashboard`, protected by Auth.js session + mandatory TOTP MFA (enroll on first admin login, require code on every login thereafter).

- List view: filter by PENDING / APPROVED / REJECTED.
- Detail view per application: applicant info, full scan-attempt history with confidence scores and failure reasons (this is good demo texture — "Attempt 1: failed, low light. Attempt 2: passed, 94% confidence"), approve/reject buttons, rejection reason field (required on reject), audit log of who did what and when.
- On approve: trigger ID generation (Phase 6) and sync to main app (Phase 7).
- On reject: store reason, set `reapplyCooldownUntil = now + 30 days`, send rejection email with reason and reapply guidance.

### Checklist — Phase 5
- [ ] MFA enforced, cannot bypass
- [ ] Approve/reject both correctly gated behind admin session
- [ ] Rejection requires a reason before submit is allowed
- [ ] Audit log entry created for every approve/reject action with adminId, timestamp, IP, user-agent

---

## 8. Phase 6 — ID generation and card

On approval:
1. Inside a DB transaction: increment `IdSequence.counter` with `SELECT ... FOR UPDATE`, derive `freelanceIdCode = FL-${firstName}-${lastName}-${paddedCounter}` and `serialNumber = SER-${lastName}-${paddedCounter}`.
2. Render ID card image via `sharp`: name, DOB, freelance ID, serial, issue date on a template background. No biometric data, no other PII on the card.
3. Upload card image to private object storage, store `cardObjectKey`.
4. Generate a card access token: random token, store `cardTokenHash` (hash it, don't store raw), `cardTokenExpiresAt = now + 48h`.
5. Send approval email with the freelance ID/serial in plaintext (fine, not sensitive) and a link to `/card/[token]` for the card image.

### Card download endpoint (`/api/card/[token]`)
- On access, prompt for DOB re-entry before rendering/serving the image.
- Rate limit: 5 failed DOB attempts per token per hour, 10 per IP per hour, 30-minute lockout on breach. Log failed attempts (token hash, IP, user-agent, timestamp) to `AuditLog`.
- On success, serve a short-lived signed URL to the card image (don't proxy the full bytes through this route if avoidable — redirect to a signed storage URL with its own short expiry).
- After `cardTokenExpiresAt` passes, token is dead regardless of DOB correctness.

### Checklist — Phase 6
- [ ] Concurrent approval test: fire N simultaneous approvals, confirm no duplicate `freelanceIdCode`/`serialNumber`
- [ ] Card image contains exactly the specified fields, nothing else
- [ ] DOB gate rate limiting verified (6th attempt in an hour is blocked)
- [ ] Expired token returns a clear "link expired" state, not a raw 404/500

---

## 9. Phase 7 — Main app sync

This piece lives in the **main freelance platform repo**, not `id-generator`. Add:

`POST /api/v1/internal/freelance-identities`
- Auth: mTLS client cert presented by the generator app (see Phase 9 for cert setup). If mTLS isn't feasible in the portfolio deployment environment (e.g. hosting doesn't support client cert verification), fall back to a strong bearer token in an `Authorization` header, rotated manually, and note in the README that mTLS is the production-intended mechanism — don't silently downgrade without documenting it.
- Body: `{ idempotencyKey, freelanceIdCode, serialNumber, legalName, dateOfBirth, isActive }`
- Behavior:
  - New `idempotencyKey` + new identity fields → create `FreelanceIdentityReference`, return 201.
  - Same `idempotencyKey` + identical payload → return 200 (idempotent replay).
  - Same `idempotencyKey` + different payload → return 409.
  - Different `idempotencyKey` but conflicting `freelanceIdCode`/`serialNumber`/`legalName`+`dateOfBirth` against an existing record → return 409.

From the `id-generator` side, on approval, call this endpoint with a UUIDv7/ULID idempotency key generated once and stored permanently on the `FreelanceIdApplication` record (or a linked `SyncAttempt` row) so retries are safe.

### Main app verification endpoint (existing, per earlier plan)
- Checks legal name + DOB + freelance ID + serial + `isActive` against `FreelanceIdentityReference`.
- Rate limit: 5 failed attempts/user/hour, 10 failed attempts/IP/hour, 30-minute lockout. Audit log every failed attempt with IP, user-agent, user ID, hashed attempted ID/serial.

### Checklist — Phase 7
- [ ] Idempotent replay returns 200 with identical payload, 409 on mismatch
- [ ] Conflicting identity fields under a fresh idempotency key correctly return 409, not silent overwrite
- [ ] Verification endpoint lockout triggers and logs correctly

---

## 10. Phase 8 — Testing

- **Unit**: id-generation sequence logic, scan decision logic (both modes), rate-limit helper, email templating.
- **Integration**: application submit → scan → approve → sync → verify, full happy path.
- **Concurrency**: N simultaneous approval requests never produce duplicate sequence numbers (use a test harness that fires parallel transactions against a test DB).
- **E2E (Playwright)**: full scan flow with a mocked/synthetic video stream (Playwright supports fake camera input) covering both pass and partial-reject paths; admin login + MFA + approve/reject; card download with correct/incorrect DOB.
- **Security spot checks**: object storage bucket not publicly listable; card token expires correctly; rate limits actually block the Nth request; no KRA-related strings anywhere in the codebase (`grep -ri kra` across `src/` and `prisma/` should return nothing).

### Checklist — Phase 8
- [ ] All above pass in CI
- [ ] `npm run typecheck && npm run lint && npm run build` clean

---

## 11. Phase 9 — Deployment notes

- Separate Postgres instance from the main app.
- Object storage: private bucket, signed URLs, public listing disabled — verify this in the provider console, not just in app config.
- mTLS cert issuance: use a managed CA or a simple internal CA (e.g. `step-ca`) if self-hosting; rotate every 90 days; document the revocation runbook even if this is a portfolio project — it's a legitimate thing to show reviewers you've thought about.
- Env vars needed: DB connection string, object storage credentials, email provider key, `KYC_MODE`, `SELFIE_RETENTION_MODE`, session/auth secrets, mTLS cert paths or bearer token fallback.
- `.env.example` should list all of these with placeholder values and a comment on each — this file itself is good portfolio texture (shows you think about config hygiene).

---

## 12. What to explicitly NOT build

- No real KRA PIN or government ID field, ever.
- No claim of third-party/government database verification in copy, code comments, or README.
- No persistent raw selfie storage in default mode.
- No silent fallback that weakens security (e.g., don't quietly drop mTLS for a plain bearer token without flagging it in the README as a documented deviation).

---

## 13. Suggested build order summary for the agent

1. Scaffold + schema (Phase 1)
2. Application form (Phase 2)
3. Scan flow + camera detection (Phase 3) — this is the centerpiece, spend the most iteration time here
4. Selfie handling mode (Phase 4)
5. Admin dashboard + MFA (Phase 5)
6. ID generation + card + download gate (Phase 6)
7. Main app sync endpoint (Phase 7)
8. Full test suite (Phase 8)
9. Deployment config + README (Phase 9)

Run the checklist at the end of each phase before moving to the next. If a checklist item fails, fix it before continuing — don't accumulate technical debt across phases in a project this size.
