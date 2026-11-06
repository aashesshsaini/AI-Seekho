# AI SEEKHO — website + secure digital store

Next.js 16 (App Router, TypeScript strict, Tailwind v4, Motion) · MongoDB Atlas (Mongoose) · Razorpay · Netlify (+ Netlify Blobs for private files).

First product: **AI SE SMART KAAM — The Practical AI Playbook** (approved v4 customer ZIP, 4 PDFs).

---

## 1. Run locally (no external accounts needed)

```bash
cd ai-seekho-website
npm install
cp .env.example .env.local        # then fill APP_SECRET (see comment in file)
```

**Frontend only** (no DB): `npm run dev` → http://localhost:3000. Pages use the bundled seed content; checkout/forms show "not configured".

**Full stack with a local database:**

```bash
npm run dev:db                      # terminal 1 — local MongoDB on :27027 (data in .data/)
# in .env.local: MONGODB_URI=mongodb://127.0.0.1:27027
npm run db:seed                     # products, assets metadata, tools, tutorials, services, draft legal pages
npm run assets:upload -- --dir ~/Downloads   # verifies SHA-256 of the approved v4 files, copies to .private-assets/
npm run admin:create -- --email you@example.com --name "Your Name"   # prompts for a password (min 12 chars)
npm run dev                         # terminal 2
```

Admin: http://localhost:3000/admin

To test real checkout locally, add Razorpay **test** keys to `.env.local` (see `docs/TESTING.md`).

## 2. Commands

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm test` | Unit + integration tests (in-memory MongoDB, mocked Razorpay/storage/email) |
| `npm run test:e2e` | Playwright: accessibility (axe), responsive, checkout UX, admin auth. Needs a running server: `BASE_URL=http://localhost:3100 E2E_ADMIN_PASSWORD=… npm run test:e2e` |
| `npx tsx --env-file=.env.local scripts/smoke-local.ts` | HTTP end-to-end smoke: signed webhook → paid → real ZIP download (checksum verified) |
| `npm run typecheck` / `npm run lint` | Types / ESLint |
| `npm run db:seed` | Idempotent seed — never overwrites price or edited content |
| `npm run admin:create` | Create an admin (owner/editor). No default passwords exist |
| `npm run assets:upload` | Verify + upload approved product files to private storage |

## 3. Architecture

```
src/app/(site)/…           public pages (static shell + cached data; dynamic parts stream)
src/app/admin/…            admin (login, dashboard, orders, products, content, settings, audit)
src/app/api/checkout/*     create order (server price) · verify signature + fetch payment
src/app/api/webhooks/razorpay   raw-body HMAC verification, idempotent by event id
src/app/api/download       short-lived HMAC-signed file links → private storage stream
src/lib/payments/          Razorpay client, state machine (service.ts), handlers.ts
src/lib/entitlements.ts    one entitlement per order (unique index), bearer token (hash stored)
src/lib/storage/           private storage: local (dev) | Netlify Blobs (prod)
src/lib/email/             provider abstraction (Resend) — inactive until configured
src/lib/auth/              scrypt passwords, DB sessions, roles
src/lib/models/            Mongoose models (all money = integer paise)
```

### Payment flow
1. Buyer submits name/email → `POST /api/checkout/create` loads the **active product price from MongoDB**, creates a `created` order, creates the Razorpay order (amount checked), sets an httpOnly checkout cookie (random secret; only its hash is stored).
2. Razorpay Checkout opens. On success the browser posts the ids + signature to `/api/checkout/verify`.
3. The server verifies `HMAC(order_id|payment_id)`, then **fetches the payment from Razorpay** and checks status = captured, amount, currency, order id.
4. Independently, the webhook (`payment.captured` / `order.paid`) does the same from the signed payload. Whichever arrives first wins; the other is a no-op.
5. The order moves to `paid` through an atomic conditional update (exactly once). Entitlement creation is idempotent (unique `orderId`). Email (if configured) is claimed atomically → sent once.
6. Mismatched amount/currency → `review` (no access). `authorized` → pending. Late `payment.failed` never downgrades a paid order. Full refund → `refunded` + entitlement revoked.

### Delivery
- Buyer sees downloads on `/order/<ref>` (same browser, cookie-authorised) and gets a **personal link** `/download/<token>` (180 days, 30 file downloads; token stored as SHA-256 + AES-GCM copy so it can be re-shown to the verified holder).
- Every file link is HMAC-signed and valid for **10 minutes**. Order ids alone authorise nothing.
- Lost link → `/recover` (email + order ref). Response is identical whether or not a purchase exists. With email configured, the link is emailed; otherwise the request waits in **Admin → Orders → Recovery requests**.

## 4. Docs
- `docs/DEPLOY_NETLIFY.md` — deployment steps, env vars, Atlas/Razorpay/Netlify setup
- `docs/TESTING.md` — automated tests + manual Razorpay test-mode and live smoke test
- `docs/SECURITY.md` — security checklist
- `docs/LAUNCH_CHECKLIST.md` — production launch checklist, required accounts, known limitations
