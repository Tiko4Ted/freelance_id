# Deployment Verification

These checks must be performed on the Truehost VPS after the app, process
manager, storage directory, and reverse proxy are configured.

## Private Local Storage

- Set `APP_BASE_URL` to the public HTTPS origin so approval emails generate
  correct `/card/[token]` download links.
- Create the storage root outside the app checkout and outside any web-served
  directory, for example `/var/lib/id-generator/storage`.
- Set `STORAGE_ROOT_PATH` to that absolute path in the app environment.
- Ensure the directory is owned by the app runtime user.
- Confirm restrictive Linux permissions:

```bash
stat -c '%A %a %U %G %n' /var/lib/id-generator/storage
ls -la /var/lib/id-generator/storage
```

Expected mode is `700` or stricter for directories owned by the runtime user.
Stored files should not be world-readable.

## Reverse Proxy Static Exposure

- Review the active nginx or reverse-proxy config on the VPS.
- Confirm no `root`, `alias`, or static `location` serves
  `/var/lib/id-generator/storage` or any parent directory that exposes it.
- Confirm static serving is limited to intended app assets such as Next.js
  build output and `public/`.

## Unauthenticated HTTP Probe

After a real stored card or demo thumbnail exists, perform an unauthenticated
request through the public deployed hostname against likely guessed paths:

```bash
curl -i https://YOUR_HOST/storage/selfie-thumbnails/application-1/1.jpg
curl -i https://YOUR_HOST/selfie-thumbnails/application-1/1.jpg
curl -i https://YOUR_HOST/var/lib/id-generator/storage/selfie-thumbnails/application-1/1.jpg
```

Expected result is `404` or another non-disclosing rejection. Stored files must
only be returned by authenticated or token-gated route handlers.

## Card Download DOB Gate

- Seed or approve a real application to create a card token.
- Submit five incorrect DOB attempts to `/api/card/[token]`; each should fail
  without returning the card.
- Submit a sixth incorrect DOB attempt within the same hour; it must return a
  rate-limit response with a 30-minute lockout.
- Confirm failed DOB attempts are present in `audit_logs` with token hash, IP,
  user-agent, and timestamp.
- Confirm an expired card token renders the clear expired-link state on
  `/card/[token]` and `/api/card/[token]`.
