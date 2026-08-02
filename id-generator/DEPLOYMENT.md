# Deployment Verification

## Temporary Vercel Deployment

- Set `DATABASE_URL` to the live Neon connection string in the Vercel dashboard.
- Set `STORAGE_DRIVER=vercel-blob`.
- Set `BLOB_READ_WRITE_TOKEN` from the Vercel Blob store.
- Set `SCHEDULER_DRIVER=vercel-cron` so the VPS node-cron watch process is not used.
- Set `INTERNAL_CRON_SECRET`; the purge route accepts `Authorization: Bearer <secret>` or `x-cron-secret`.
- Set Auth.js/admin secrets such as `AUTH_SECRET`.
- Set `APP_BASE_URL` to the deployed Vercel URL before testing approval emails.
- Confirm the main app sync endpoint is reachable from Vercel. If the main app is later restricted to the VPS/private network, this temporary Vercel demo may not sync to it; that is an expected demo-environment limitation.
- Vercel Hobby accounts reject hourly Cron schedules. The committed `vercel.json` uses the requested hourly purge cadence, so this project needs a Pro plan for deployment as-is. A daily schedule would deploy on Hobby, but that is a deliberate cadence change.

## VPS Deployment-Time Checks

- Create the local storage directory for the app runtime user, outside all web-served roots, with restrictive permissions such as `chmod 700`.
- Review nginx/reverse-proxy static `location` blocks and confirm the local storage path is not reachable over HTTP.
- Run a real unauthenticated HTTP probe against a guessed storage path after deployment and confirm it returns 404/401, never stored bytes.
