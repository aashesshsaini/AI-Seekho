# Security checklist

Legend: ✅ implemented and tested · 🟡 implemented, needs production verification · ⬜ owner action

## Payments
- ✅ Price comes only from MongoDB; request schema is `.strict()` and rejects amount/price/currency fields
- ✅ Razorpay order amount compared with our order before saving
- ✅ Checkout signature HMAC-SHA256(`order_id|payment_id`) with a constant-time compare
- ✅ Payment fetched server-side; status, amount, currency and order id must match
- ✅ Webhook HMAC computed over the **raw** body; invalid signatures get 400
- ✅ Idempotency: event-id ledger (`PaymentEvent.eventId` unique), conditional status transitions, unique entitlement per order, atomic email claim
- ✅ Out-of-order safety: `paid` can't be downgraded by a late `payment.failed`
- ✅ Mismatches go to `review`, never `paid`
- ✅ Test/live separated by keys + `RAZORPAY_MODE`; orders store their mode
- ✅ No card/UPI data is stored or logged; secret keys are server-only (`server-only` imports)
- 🟡 Live webhook delivery and retries (verify in the Razorpay dashboard)

## Digital delivery
- ✅ Paid files are outside `/public` (local `.private-assets/` is gitignored; production uses Netlify Blobs)
- ✅ Access needs (a) the buyer's httpOnly checkout cookie secret or (b) a 256-bit bearer token (stored only as a SHA-256 hash plus an AES-GCM copy)
- ✅ File links are HMAC-signed with 10-minute expiry; tampering → 403; expired → 410
- ✅ Download cap per entitlement (30), atomic counter; storage failures don't consume a download
- ✅ Refund → entitlement revoked; audit row for every download attempt (IP stored only as an HMAC)
- ✅ Recovery endpoint doesn't reveal whether an email has purchases; rate-limited
- ✅ Download/order pages are `noindex` with `Referrer-Policy: no-referrer`
- 🟡 Netlify Blobs read path and streamed download on Netlify (verify after deploy)

## Admin
- ✅ scrypt password hashing (N=2^15); minimum 12 chars with letters + numbers; no default password; CLI-only first admin
- ✅ DB-backed sessions (random 256-bit token, hash stored, 12h TTL index); cookie httpOnly, Secure in prod, SameSite=Strict
- ✅ Every admin page **and** every server action calls `requireAdmin(role)`; the proxy redirect is only optimistic
- ✅ Roles: owner (orders, products/prices, settings, audit) and editor (content, enquiries)
- ✅ Login rate limit (10 per 15 min per IP), account lockout after 8 failures, timing-equalised for unknown users
- ✅ Audit log for logins, price/product changes, content, settings, link regeneration, email resends
- ⬜ Use a unique, strong admin password; don't share accounts

## Web
- ✅ CSP (Razorpay, consent-gated analytics and Turnstile origins only), `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, HSTS, Referrer-Policy, Permissions-Policy
- ✅ Markdown is rendered as React elements (no raw HTML); only https/relative links allowed
- ✅ JSON-LD escaped; no ratings or reviews in structured data
- ✅ Forms: zod validation, honeypot, timing check, link-spam filter, rate limits, optional Turnstile
- ✅ Analytics load only after explicit consent and only when IDs are configured; events carry no PII
- 🟡 CSP uses `'unsafe-inline'` for scripts (Next inline bootstrap). A nonce-based CSP is a possible hardening step
- ⬜ Rotate `APP_SECRET` only if needed. Rotating it invalidates all download tokens and links, so re-issue links via admin

## Infrastructure
- ✅ Secrets only in env vars; `.env*` (except `.env.example`), `*.zip`, `.private-assets/` and `.data/` are gitignored
- ⬜ Atlas: least-privilege DB user, strong password, backups enabled
- ⬜ Netlify: enable 2FA on Netlify, GitHub, Razorpay and Atlas accounts
