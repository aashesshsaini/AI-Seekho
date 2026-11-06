# Testing

## Automated (no accounts needed)
```bash
npm test                       # 65 unit + integration tests (in-memory MongoDB replica set)
```
Covers: paise conversion · DB-driven pricing and price-tampering rejection · order creation and gateway failure · checkout signature · webhook raw-body signature · duplicate and concurrent webhooks (exactly one entitlement/email) · webhook-before-browser · out-of-order failed/captured · wrong amount/currency → review · authorized → pending · refunds revoke access · crashed-event retry · entitlement creation only after verified payment · unauthorized, tampered and expired download links · download limits · storage outage · non-enumerating recovery · admin password hashing, sessions, lockout, deactivation, roles · enquiry validation, honeypot, timing and link-spam filters · rate limiting (including concurrency).

All Razorpay, storage and email calls are **mocked**. These tests do **not** prove live payments work.

End-to-end against a running build:
```bash
npm run build && npx next start -p 3100 &
npx tsx --env-file=.env.local scripts/smoke-local.ts          # signed webhook → paid → real ZIP SHA-256 check
BASE_URL=http://localhost:3100 E2E_ADMIN_PASSWORD='…' npm run test:e2e   # axe WCAG A/AA, mobile+desktop, admin auth
```

## Manual: Razorpay test-mode checkout (local or deployed)
Prerequisites: test keys in env; webhook configured (for local, expose the server with a tunnel such as `cloudflared tunnel --url http://localhost:3000` and use that URL for the webhook).

1. Open `/products/ai-se-smart-kaam` → **Get AI SE SMART KAAM — ₹199** → fill name/email → tick the terms box → Continue.
2. Pay in Razorpay test mode using the test card or UPI details listed in Razorpay's current test-mode docs.
3. Expect: redirect to `/order/AIS-…`, briefly "Payment confirm ho raha hai", then **Payment verified** with 5 download links and a personal link.
4. Download the ZIP; check `shasum -a 256` = `adc89b4e7202c77333997e294ee8bdc30e30d4eccbd8cd01fc6458e5e9769027`.
5. Razorpay Dashboard → Webhooks → the delivery shows **200**. Admin → Orders → the order is `paid` with both `verify` and `webhook` events, one entitlement and a status history.
6. **Failure path:** start again and choose a failing test method or close the modal. The order stays `created`/`failed` with no downloads, and you can retry.
7. **Webhook-only path:** pay, then close the tab before the redirect. Reopen `/order/<ref>` in the same browser: it should show paid (via the webhook).
8. **Recovery:** open `/recover` in a private window with the email + order ref. You see the same message for a wrong email. Without email configured, the request shows in Admin → Orders → Recovery requests.
9. **Refund (optional):** fully refund in the dashboard → the order becomes `refunded` and the personal link stops working.

## Manual: first live-payment smoke test (only after your explicit approval)
1. Switch env to live keys, `RAZORPAY_MODE=live`, set up the live webhook with a new secret, and redeploy.
2. Buy once with your own card/UPI at the real price.
3. Verify the steps 3–5 above against **live** mode. The admin dashboard shows LIVE orders separately from test.
4. Refund yourself from the Razorpay dashboard and confirm access is revoked.
5. Check the Netlify function logs for errors. No secrets or customer data should appear in logs.
