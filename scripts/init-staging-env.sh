#!/usr/bin/env bash
# Creates .env.staging.local (gitignored, chmod 600) with PLACEHOLDERS only.
# You fill the values yourself in your editor — never paste them into chat.
set -euo pipefail
f=".env.staging.local"
if [ -e "$f" ]; then echo "$f already exists — not overwriting."; exit 0; fi
umask 077
cat > "$f" <<'TPL'
# Local-only file used by `npm run staging:*` scripts. Gitignored. Do not share.
# 1) MongoDB Atlas staging connection string (Atlas → Connect → Drivers). Keep the password URL-encoded.
MONGODB_URI=
MONGODB_DB=aiseekho_staging
# 2) Netlify (only needed for `npm run staging:upload`). Project ID from Netlify → Project configuration → General.
NETLIFY_SITE_ID=
# Personal access token with a SHORT expiry (User settings → Applications). Delete it after uploading.
NETLIFY_AUTH_TOKEN=
STORAGE_DRIVER=netlify-blobs
BLOBS_STORE=product-files
RAZORPAY_MODE=test
# 3) Staging site + gate (same values you set in Netlify) — used by `npm run staging:verify`.
STAGING_URL=https://ai-seekho.netlify.app
STAGING_GATE_USER=
STAGING_GATE_PASSWORD=
TPL
chmod 600 "$f"
echo "Created $f (permissions 600). Open it in your editor and fill the values."
