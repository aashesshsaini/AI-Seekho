# Private staging deployment

Goal: a **private, test-mode** copy of the site on Netlify Free. Real payments stay off, nothing is public or indexed, `main` isn't touched, and the approved product ZIP stays unchanged.

Facts marked **[docs]** come from official Netlify pages read on 6 Nov 2026. Items marked **[verify on staging]** are assumptions until tested.

---

## 1. Verified platform limits

| Limit | Value | Source |
|---|---|---|
| Free plan credits | 300/month, **hard limit**, can't buy extra on Free | [docs] how-credits-work, credit-based-pricing-plans |
| When credits run out | **All projects paused** ("Site not available") until the next billing cycle or an upgrade | [docs] how-credits-work, billing FAQ |
| Bandwidth | 20 credits / GB | [docs] pricing |
| Compute (functions) | 10 credits / GB-hour (functions run at 1024 MB) | [docs] |
| Requests | 2 credits / 10,000 | [docs] |
| Production deploy | 15 credits each; deploy previews and branch deploys 0; failed deploys 0 | [docs] |
| Usage alerts | email + in-app at 50/75/90/100% | [docs] billing FAQ |
| Password protection / basic-auth headers | **Not on Free** (Pro only) → we use our own gate | [docs] plan comparison |
| Private repos | "Organization-owned private repos" are Pro only. Personal-account private repos aren't stated either way | [docs] → [verify on staging] |
| Commercial use on Free | Not stated in pricing docs; governed by the Self-Serve Subscription Agreement (not yet confirmed) | open item |
| Function memory | 1024 MB (not configurable on Free) | [docs] functions configuration |
| Buffered response | 6 MB | [docs] |
| **Streamed response** | **20 MB, 60-second execution limit** (docs don't say whether this is total stream time or compute) | [docs] functions API |
| Blobs | private ("only accessed through your own site"), encrypted at rest/in transit, max object 5 GB, site-wide store shared by all deploys | [docs] Netlify Blobs |
| Blobs inside Next.js route handlers | docs say context is auto-set for "Functions, Edge Functions, Build Plugins"; Next.js not named | [verify on staging] |

### What this means for the 10.7 MB ZIP
- **Storage:** in Netlify Blobs, private, site-wide store `product-files`. It's uploaded once from your Mac with `npm run staging:upload`, which checks the filename, size and SHA-256 and reads back the metadata after uploading. It never enters Git or the deploy bundle (checked: no traces in `.next`, no files under `/public`).
- **Memory:** the download route pipes the Blobs stream straight into the response (`store.get(key, { type: "stream" })`), so the file is never buffered. Memory stays far below 1024 MB.
- **Size:** 10.7 MB < 20 MB streamed limit ✓. The ZIP would **fail** in buffered mode (6 MB), so it must stream.
- **Time ⚠️:** if the 60 s limit covers the whole stream, the ZIP needs about **1.5 Mbps or faster** sustained (10.7 MB ÷ 60 s). Slower connections could be cut off mid-download. The largest PDF (4.4 MB) needs about 0.6 Mbps. Mitigations already in the site: every PDF has its own link, the page suggests PDFs on slow internet, and a failed attempt can be retried (30 downloads allowed). The staging test (§6, T7) measures this with a throttled download. If the stream is cut, the fallback (§3) moves file delivery off Netlify Functions.

---

## 2. Usage estimate (assumptions, not measurements)

Assumptions: 2% conversion (50 visitors per purchase). Each visitor transfers about 0.7 MB (Lighthouse measured 549 KB for the product page) and makes about 35 requests. Each purchase downloads the ZIP once (10.7 MB, "typical") or the ZIP plus all PDFs (22.7 MB, "heavy"). Download compute is 0.01–0.17 credits depending on connection speed. There are 4 production deploys/month (60 credits).

| Item (per purchase) | Typical | Heavy |
|---|---|---|
| Download bandwidth | 0.21 | 0.45 |
| Visitor bandwidth (50 × 0.7 MB) | 0.70 | 0.70 |
| Requests (≈1,750) | 0.35 | 0.35 |
| Compute (download + checkout/webhook/order page) | 0.05 | 0.20 |
| **Credits per purchase** | **≈1.3** | **≈1.7** |

| Purchases / month | Purchases + 60 deploy credits | vs Free 300 |
|---|---|---|
| 100 | **190–230** | fits (63–77%) |
| 500 | **710–910** | ❌ 2.4–3× over → site paused |
| 1,000 | **1,360–1,760** | ❌ 4.5–6× over |

Visitor traffic, not downloads, is the biggest cost. At 1% conversion, the visitor share doubles. On these assumptions Free covers roughly **110–180 purchases/month**, or about 11,000 visitors with no purchases at all.

## 3. Monitoring and fallback strategy

1. **Alerts:** Netlify emails you at 50/75/90/100% by default. Use an inbox you read daily.
2. **Admin dashboard:** shows month-to-date downloads, download egress (GB) and estimated download credits, plus a "Product files 5/5" storage health check.
3. **Rule:** if projected monthly credits pass **200 (≈67%)**, upgrade to a paid plan (Personal or Pro; check the current price and credits on netlify.com/pricing) **before** the hard stop. A paused site also blocks checkout and existing customers' downloads, which costs more than a few dollars a month.
4. **Deploy discipline:** test on deploy previews (0 credits), batch production deploys, and avoid pushing many small commits to the deploy branch.
5. **File-delivery fallback (if T7 shows cut-offs, or download egress becomes significant):** move product files to an S3-compatible bucket (e.g. Cloudflare R2) and redirect to 5-minute presigned URLs. Downloads then skip Netlify bandwidth and the 60 s limit entirely. The storage layer is already an interface, so this is an add-on driver plus an upload target. Check R2's pricing and free tier before choosing it.
6. **Before live launch:** confirm the Free plan permits commercial use (Self-Serve Subscription Agreement or Netlify support). If unclear, start live on a paid plan.

---

## 4. Account setup — one at a time

### Account 1 — GitHub private repository
1. Turn on **2-factor authentication** for your GitHub account (Settings → Password and authentication).
2. Create the repo, either **A)** by telling me "create the repo" (I'll run `gh repo create ai-seekho-website --private` with the already-signed-in `gh` CLI and push the two branches), or **B)** manually: github.com/new → Owner: *your personal account* (not an organization, since org private repos are Pro-only on Netlify) → Name `ai-seekho-website` → **Private** → leave README, .gitignore and license **unchecked** → Create. Then tell me it exists.
3. Before every push I run `npm run check:safety`, which fails if any env file, ZIP/PDF, local DB data or secret pattern is tracked.
4. Recommended: Settings → Code security → enable Dependabot alerts.

### Account 2 — MongoDB Atlas (staging database)
1. Sign up at mongodb.com/atlas and turn on 2FA.
2. Create a **free cluster**. Pick a provider/region close to the Netlify functions region (default functions region is US East; check in Netlify later).
3. **Database Access → Add user:** username `aiseekho_staging`, *Autogenerate secure password* (save it in your password manager). Built-in role: **Read and write to any database**, or a custom role limited to `readWrite@aiseekho_staging`.
4. **Network Access:** add `0.0.0.0/0` (Netlify has no fixed outbound IPs on Free). The strong password and TLS are the protection.
5. **Connect → Drivers** → copy the `mongodb+srv://…` string, replacing `<password>` with the URL-encoded password.
6. On your Mac: `npm run staging:init-env`, then open **`.env.staging.local`** in VS Code and fill `MONGODB_URI`. Don't paste it into chat.
7. Then I run `npm run staging:seed` (products, assets metadata, content, draft legal pages; **no admin user is created**), and you run `npm run staging:admin -- --email <you> --name "<name>"` and type a password at the hidden prompt.

### Account 3 — Netlify Free (private staging site)
1. Sign up at netlify.com **with GitHub** and turn on 2FA.
2. **Add new project → Import from Git → GitHub →** authorize **only** the `ai-seekho-website` repo.
3. Settings: Branch to deploy **`feat/ai-seekho-platform`** (this staging site's "production" is the feature branch; `main` is never built). Build settings come from `netlify.toml`.
4. **Before the first deploy finishes,** add the environment variables below (Project configuration → Environment variables). Then trigger a deploy. Changing `STAGING_GATE_*` or any `NEXT_PUBLIC_*` value needs a **redeploy**.
5. For the asset upload: copy the Project ID into `.env.staging.local` → `NETLIFY_SITE_ID`. Create a Personal Access Token with the **shortest expiry** (User settings → Applications) → `NETLIFY_AUTH_TOKEN`. Then I run `npm run staging:upload`. Delete the token afterwards.

### Account 4 — Razorpay Test Mode
1. Sign up at razorpay.com and enable 2FA. Test mode works before KYC; **don't** activate live mode now.
2. Switch the dashboard to **Test Mode** → Account & Settings → **API Keys → Generate Test Key**. Copy the Key ID and Key Secret **directly into Netlify env vars** (below), not into chat.
3. **Webhooks → Add new webhook** (in Test Mode):
   - URL `https://<your-staging-site>.netlify.app/api/webhooks/razorpay`
   - Secret: generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, paste it into Razorpay and into Netlify `RAZORPAY_WEBHOOK_SECRET`.
   - Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
4. **Payment capture: automatic** (Account & Settings → Payment capture).

---

## 5. Environment variables

**Netlify** (Project configuration → Environment variables; scope: all, contexts: all, since it's a single-purpose staging site). Mark the 🔒 values as secret if your plan offers the option.

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<site>.netlify.app` | public, inlined at build |
| `APP_SECRET` 🔒 | generate: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` | signs download links and encrypts tokens |
| `MONGODB_URI` 🔒 | Atlas connection string | needed at build and runtime |
| `MONGODB_DB` | `aiseekho_staging` | keeps staging separate from future production |
| `RAZORPAY_MODE` | `test` | never `live` without explicit approval |
| `RAZORPAY_KEY_ID` | `rzp_test_…` | |
| `RAZORPAY_KEY_SECRET` 🔒 | test key secret | |
| `RAZORPAY_WEBHOOK_SECRET` 🔒 | the secret you set on the webhook | |
| `STORAGE_DRIVER` | `netlify-blobs` | the site refuses the local driver on Netlify |
| `BLOBS_STORE` | `product-files` | |
| `STAGING_GATE_USER` | e.g. `team` | turns on the Basic Auth gate + noindex |
| `STAGING_GATE_PASSWORD` 🔒 | 16+ random chars (generate as above) | min 12 chars or the gate stays off |
| *(leave unset)* | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `BLOBS_REGION` | email and analytics off on staging; default Blobs region |

**Local `.env.staging.local`** (created by `npm run staging:init-env`, chmod 600, gitignored): `MONGODB_URI`, `MONGODB_DB=aiseekho_staging`, `NETLIFY_SITE_ID`, `NETLIFY_AUTH_TOKEN` (temporary), `STORAGE_DRIVER=netlify-blobs`, `BLOBS_STORE=product-files`, `RAZORPAY_MODE=test`.

Never put a secret in a `NEXT_PUBLIC_*` variable; those are shipped to the browser.

---

## 6. Staging test plan (run after accounts are connected)

| # | Test | Pass criteria |
|---|---|---|
| T1 | Gate | `curl -I` site → 401; with credentials → 200; `robots.txt` = Disallow all; `X-Robots-Tag: noindex` |
| T2 | Admin | `/admin` → login; dashboard shows Razorpay TEST, webhook configured, **Product files 5/5 in netlify-blobs**, gate On |
| T3 | Real test-mode checkout | pay with a Razorpay test method → `/order/…` shows Payment verified |
| T4 | Signed webhook | Razorpay dashboard shows webhook deliveries 200; admin order shows `verify` + `webhook` events, one entitlement |
| T5 | MongoDB persistence | order, customer, entitlement, payment events, download audit visible in Atlas `aiseekho_staging` |
| T6 | Blobs download | ZIP + 4 PDFs download; `shasum -a 256` of ZIP = `adc89b4e…769027` |
| T7 | Streaming limits | `curl --limit-rate 150k` (≈1.2 Mbps) on a fresh ZIP link: record whether it completes past 60 s. Repeat at 300k |
| T8 | Negative | tampered link 403; expired link 410; another browser without cookie can't see the order; failed test payment → no access |
| T9 | Recovery | `/recover` same message for match and non-match; matched request appears in admin queue |
| T10 | Logs | Netlify function logs: no secrets, no customer PII, no unhandled errors |
