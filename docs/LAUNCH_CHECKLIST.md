# Production launch checklist

## Required accounts and credentials (owner)
| Service | Needed for | Status |
|---|---|---|
| Netlify account (+ GitHub repo) | hosting, functions, Blobs | ⬜ |
| MongoDB Atlas | database | ⬜ |
| Razorpay (test keys now; KYC + live keys later) | payments | ⬜ |
| Email provider (e.g. Resend) + custom domain DNS | purchase/recovery emails | optional, ⬜ |
| GA4 / Meta Pixel IDs | analytics (consent-gated) | optional, ⬜ |
| Cloudflare Turnstile keys | extra spam protection | optional, ⬜ |

## Owner decisions / content (blocking for live payments)
- ⬜ Final legal pages: business/legal name, contact, grievance contact, **refund policy terms and timelines**, GST status, jurisdiction. Edit and tick **Approved** in Admin → Settings
- ⬜ Public support email and response time (Admin → Settings)
- ⬜ Confirm the ₹199 launch price (Admin → Products)
- ⬜ Human sign-off on the e-book. The v4 release audit addendum says *"TECHNICALLY READY — HUMAN SIGN-OFF PENDING"*, and its human-only tests (phone reading checklist, Hinglish review sheet, external links in an Indian browser) are marked NOT TESTED
- ⬜ Approve the 5 preview pages shown publicly (Contents, Apna track chunein, RASTA, 30-day challenge, B1 prompts)
- ⬜ Review the 2 draft tools (Gemini Notebook, Google Flow): confirm official URLs, then publish
- ⬜ Write or approve the 4 draft tutorials, or leave them unpublished
- ⬜ Explicit approval to switch Razorpay to **live**

## Technical launch steps
- ⬜ Deploy to Netlify (`docs/DEPLOY_NETLIFY.md`), with env vars set and `RAZORPAY_MODE=test`
- ⬜ Seed the production DB, create the owner admin, upload assets to Blobs (checksums verified by the script)
- ⬜ Deployed smoke test: pages load, `/admin` → login, a test-mode purchase end-to-end (docs/TESTING.md), webhook 200 in the Razorpay dashboard, ZIP checksum matches
- ⬜ Lighthouse on the deployed product page (mobile)
- ⬜ Razorpay activation review submitted with the final policy pages
- ⬜ Switch to live after approval → live smoke test with your own purchase + refund
- ⬜ Turn on Atlas backups; check Netlify usage/credits after the first week

## Known limitations / outstanding work
- No customer accounts / library yet (the schema supports it: `Customer` ↔ `Order` ↔ `Entitlement`)
- Email delivery inactive until a provider + verified domain are configured; recovery then goes through the admin queue
- Newsletter section intentionally omitted (no consent-based email integration configured)
- Admin can't yet create new products or upload new files from the UI (seed/script based); it edits existing products, prices, previews and status
- No admin UI for adding admin users (CLI: `npm run admin:create`)
- Invoices/GST receipts not generated (depends on your GST status; Razorpay sends payment receipts)
- CSP allows inline scripts (Next.js bootstrap); a nonce-based CSP is possible future hardening
- Rate limits are per-IP, stored in MongoDB; heavy abuse would need a WAF/edge limits
