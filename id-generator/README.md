# Freelance ID Generator

Standalone Next.js 14 application for a portfolio-grade freelance ID application
workflow. This app demonstrates intake, scan-quality checks, admin review, ID
generation, private card storage, and protected sync to a separate main platform.

This is not real government or third-party identity verification. The scan flow
is a presence and image-quality check for a demo workflow, and selfie frames are
ephemeral by default so raw camera images are not persisted.

The ID card is informational only in v1. It contains only the approved applicant
name, date of birth, freelance ID, serial number, and issue date. No biometric
data, verification hash, or government identifier is embedded.

## Phase 1

- Next.js 14 App Router scaffold with strict TypeScript and Tailwind CSS.
- Prisma 7 configured for a dedicated PostgreSQL database.
- UUID primary keys and `created_at` / `updated_at` columns on persisted models.
- Atomic ID counter foundation using a lockable `id_sequences` row and
  `SELECT ... FOR UPDATE`.
- `.env.example` documents required configuration without committing secrets.

## Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` values into a local `.env`.
3. Run `npm run prisma:generate`.
4. Run `npm run prisma:migrate -- --name init`.
5. Run `npm run prisma:seed`.

## Security Notes

The generator and main freelance platform are separate trust boundaries. The
production-intended sync transport is mTLS. A strong bearer token fallback is
available for portfolio environments that cannot terminate client certificates,
but that fallback must be documented in deployment notes when used.

Demo-mode selfie thumbnails are purged by `npm run selfies:purge:scheduler`,
which starts an hourly `node-cron` job. Private generated cards and demo
thumbnails are stored under `STORAGE_ROOT_PATH`, which must be an absolute path
outside `public/` and outside any nginx/static web root. On the VPS, create the
directory for the app runtime user with restrictive permissions such as
`chmod 700 /var/lib/id-generator/storage`; stored files are served only through
authenticated or token-gated route handlers.

## Development

```bash
npm run dev
```
