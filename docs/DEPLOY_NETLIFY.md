# Deploying to Netlify

> Status: configuration prepared, **not yet deployed** — needs your Netlify, MongoDB Atlas and Razorpay accounts.

## 0. Check current limits first (they change)
- **Netlify pricing / free plan** — https://www.netlify.com/pricing/ . Third-party summaries (Nov 2026) describe a credit-based free plan (~300 credits/month) that **pauses the site when credits run out**, and say commercial use is allowed. Confirm both on Netlify's own page before launch. Each full purchase download (ZIP 10.7 MB, or ~12 MB for all PDFs) is served through a function and counts toward bandwidth.
- **Netlify Functions limits** — current docs list 6 MB for buffered and 20 MB for streamed responses. Downloads stream, and the largest file is 10.7 MB.
- **Netlify Blobs** — check storage limits for your plan.

## 1. MongoDB Atlas
1. Create a free cluster (M0) in a Mumbai (ap-south-1) region if available.
2. Database Access → create a user with **readWrite on the `aiseekho` database only**, with a long random password.
3. Network Access → Netlify has no fixed outbound IPs on standard plans, so allow `0.0.0.0/0`. Security then relies on the strong DB password and TLS.
4. Copy the `mongodb+srv://…` connection string → `MONGODB_URI`.

## 2. Netlify site
1. Push this repo to GitHub (private repo recommended) and choose **Add new site → Import from Git** in Netlify. `netlify.toml` already sets the build command, Node 22 and `.next` publish.
2. Accept the suggested `*.netlify.app` name, or pick another if it's free. Don't assume a particular name is available.
3. Site configuration → Environment variables (mark secrets as **secret**):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-site>.netlify.app` (change later for a custom domain) |
| `APP_SECRET` | 48+ random chars (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) |
| `MONGODB_URI`, `MONGODB_DB` | from Atlas, `aiseekho` |
| `RAZORPAY_MODE` | `test` (switch to `live` only after explicit approval) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay **test** keys |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you set on the Razorpay webhook |
| `STORAGE_DRIVER` | `netlify-blobs` |
| `BLOBS_STORE` | `product-files` |
| optional | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |

The build needs `MONGODB_URI` reachable, because public pages prerender from the database.

## 3. Seed the production database and upload the product (from your Mac)
```bash
# .env.production.local (gitignored) with the production MONGODB_URI
npx tsx --env-file=.env.production.local scripts/seed.ts
npx tsx --env-file=.env.production.local scripts/create-admin.ts --email you@… --name "…"
STORAGE_DRIVER=netlify-blobs NETLIFY_SITE_ID=<site id> NETLIFY_AUTH_TOKEN=<personal access token> \
  npx tsx scripts/upload-assets.ts --dir ~/Downloads
```
The upload refuses any file whose name, size or SHA-256 doesn't match the approved v4 release.
Revoke the personal access token afterwards if you don't need it.

## 4. Razorpay (test mode)
1. Dashboard → **Test mode** → API Keys → generate test keys.
2. Webhooks → Add: URL `https://<your-site>.netlify.app/api/webhooks/razorpay`, a strong secret, and these events:
   `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
3. Payment capture settings: **automatic capture**. Otherwise payments stay `authorized`, which the site correctly shows as pending.
4. Activation / live mode needs website and policy checks (Terms, Privacy, Refund/Cancellation, Delivery/Shipping, Contact, About, pricing). Finalise and approve the legal pages in Admin → Settings first. Ask Razorpay whether a `netlify.app` subdomain is acceptable for your account or whether a custom domain is needed.

## 5. After deploy — smoke test
See `docs/TESTING.md` → "Deployed test-mode smoke test".

## Custom domain later
Add the domain in Netlify, then update `NEXT_PUBLIC_SITE_URL`, the Razorpay webhook URL and the website URL on your Razorpay account, and re-deploy. No code changes are needed.

## Email provider note
Resend (and similar providers) need DNS verification of the sending domain, which you can't do on a `netlify.app` subdomain. Production email delivery therefore realistically needs a custom domain. Until then, buyers get their link on the order page, and recovery requests go to the admin queue.
