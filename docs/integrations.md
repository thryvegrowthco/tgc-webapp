# Third-Party Integrations — Thryve Growth Co.

All integrations are configured via environment variables. See `docs/environment-variables.md` for the full variable reference and `docs/workflows.md` for how these integrations participate in each data flow.

---

## Supabase

**What it does:** Authentication, Postgres database, and file storage. The backbone of the entire app.

**Client files:** `src/lib/supabase/client.ts`, `server.ts`, `service.ts`, `middleware.ts`

**Env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (safe for browser)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key for client-side auth (safe for browser)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key — **never expose to browser; grants full DB access bypassing RLS**

**Where to get credentials:** Supabase dashboard → Project Settings → API

**Auth setup:**
- Email/password auth only (no OAuth providers)
- On signup, `emailRedirectTo` points to `/auth/callback`, which exchanges the auth code for a session cookie
- All auth emails (signup confirmation, password reset, magic link, email change) are intercepted by the **Send Email hook** (`/api/auth/send-email`) and sent via Resend — see the Resend section below
- Password reset and confirmation links go through `/auth/confirm?token_hash=...` (the hook constructs token_hash URLs; the existing `/auth/callback` handles `?code=` links only)

**Database:**
- Postgres with Row Level Security (RLS) enabled on all tables
- See `docs/database-schema.md` for full schema and RLS policies
- Migrations in `supabase/migrations/` — apply with `npx supabase db push` or via the Supabase SQL editor

**Storage:**
- Single bucket: `documents` (private)
- Client documents + blog images both in this bucket
- See `docs/database-schema.md → Storage Bucket` for path conventions and RLS

**Graceful degradation:** None — Supabase is required for all functionality.

---

## Stripe

**What it does:** Handles all payments — one-time service bookings and the monthly Job Alerts subscription.

**Client file:** `src/lib/stripe/client.ts` (lazy Proxy singleton)
**Products file:** `src/lib/stripe/products.ts` (all service definitions and price IDs)

**Env vars:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Browser-safe key for Stripe.js
- `STRIPE_SECRET_KEY` — Server-side key for creating sessions and verifying webhooks
- `STRIPE_WEBHOOK_SECRET` — Endpoint secret to verify incoming webhook signatures
- 10 price ID vars — see `docs/environment-variables.md`

**Where to get credentials:** Stripe dashboard → Developers → API Keys; webhook secret from Developers → Webhooks

**Webhook endpoint to register in Stripe:** `https://thryvegrowth.co/api/webhooks/stripe`
**Events to enable:** `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

**PaymentIntent expand:** Both checkout handlers call `stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] })` so the receipt email can render `payment_method_details.card.brand`, `last4`, and the Stripe-hosted `receipt_url`. The receipt template uses `{{#if card_last4}}` and `{{#if stripe_receipt_url}}` blocks so missing values render as empty — important for test mode + non-card payments (ACH, etc.).

**Lazy Proxy singleton:** The Stripe client is wrapped in a JavaScript `Proxy` that defers `new Stripe(...)` until first access. This prevents `next build` from failing when `STRIPE_SECRET_KEY` is not set in the build environment.

**Adding a new service:**
1. Create the product and price in Stripe dashboard
2. Add the price ID env var to Vercel and `.env.local`
3. Add a new `ServiceKey` in `src/lib/stripe/products.ts`
4. Add the entry to the `SERVICES` record and `SERVICE_SELECT_OPTIONS` array
5. If the service requires a calendar slot, add it to `BOOKABLE_SERVICES`
6. Update `docs/environment-variables.md` with the new var

**Graceful degradation:** None — payments are core functionality.

### Testing payments

The Stripe integration is mode-agnostic — the code uses whatever keys are set in the environment. Test mode is controlled entirely by env vars.

**Confirm you're in test mode:** check `.env.local` — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should start with `pk_test_` and `STRIPE_SECRET_KEY` should start with `sk_test_`. All 10 `STRIPE_PRICE_*` vars must reference test-mode price IDs from the Stripe dashboard (products created while the dashboard is in test mode).

**Run a test payment:**
1. `npm run dev`, go through a booking flow, reach the Stripe-hosted checkout page
2. Use a Stripe test card (any future expiry, any 3-digit CVC, any ZIP):

| Card number | Outcome |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Insufficient funds (declined) |
| `4000 0025 0000 3155` | Requires 3DS authentication |
| `4000 0000 0000 0002` | Generic decline |

3. Verify the charge in Stripe Dashboard → Payments (test mode toggle on) — no real money moves

**Forward webhooks locally** (required for booking records to land in Supabase during local testing):
1. Install the CLI: `brew install stripe/stripe-cli/stripe`
2. `stripe login`
3. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the `whsec_…` value the CLI prints — paste it into `.env.local` as `STRIPE_WEBHOOK_SECRET` (this value is different from the production webhook secret)
5. Complete a test checkout — the CLI window shows events being forwarded, and a row appears in `bookings` + `payments`

**Switch to live mode (when ready):**
1. Toggle Stripe Dashboard from "Test mode" to "Live mode"
2. Create production products + prices — copy the live price IDs
3. Register the production webhook at `https://thryvegrowth.co/api/webhooks/stripe` → copy its signing secret
4. In Vercel → Project Settings → Environment Variables (Production scope only): replace all Stripe keys + price IDs + webhook secret with the live values
5. Leave `.env.local` on test keys for ongoing local work — production and test webhook secrets must stay separate per environment

---

## Resend

**What it does:** Sends all transactional emails — auth emails, booking confirmations, admin alerts, and the weekly job digest.

**Client file:** `src/lib/email/resend.ts` (lazy Proxy singleton + booking email functions)
**Auth email templates:** `src/lib/email/auth-emails.ts`

**Env vars:**
- `RESEND_API_KEY` — API key from Resend dashboard
- `RESEND_WEBHOOK_SECRET` — Svix signing secret for the newsletter tracking webhook (see Webhook section below)
- `SUPABASE_HOOK_SECRET` — shared secret for verifying Send Email hook requests (see Auth Hooks section in environment-variables.md)
- `NEWSLETTER_BUSINESS_ADDRESS` — CAN-SPAM-required physical address rendered in newsletter footers

**Where to get credentials:** Resend dashboard → API Keys

**From address:** `Thryve Growth Co. <hello@go.thryvegrowth.co>` — must be a verified sending domain in Resend  
**Admin alert address:** `hello@thryvegrowth.co`

**Send Email hook setup (one-time):**
1. Deploy the app to production
2. Supabase dashboard → Authentication → Hooks → **Send Email**
3. Set URL to `https://thryvegrowth.co/api/auth/send-email`
4. Copy the generated secret → add to Vercel as `SUPABASE_HOOK_SECRET`
5. Supabase dashboard → Authentication → Emails → **SMTP Settings** → enable Custom SMTP with Resend creds (host `smtp.resend.com`, port `465`, user `resend`, pass = `RESEND_API_KEY`). The hook bypasses SMTP at runtime, but enabling this flag removes Supabase's default **2 emails/hour** cap on auth emails.
6. Supabase dashboard → Authentication → **Rate Limits** → raise "Rate limit for sending emails" to 30–100/hour to match real signup volume.

**Hook handler:** `src/app/api/auth/send-email/route.ts`
- Verifies the Standard Webhooks signature (`webhook-id` + `webhook-timestamp` + `webhook-signature` headers) Supabase uses for current Auth Hooks. Signed payload is `${webhook_id}.${webhook_timestamp}.${raw_body}`; HMAC key is the base64-decoded portion of the secret after `whsec_`. Multiple space-separated signatures are accepted to support key rotation.
- Legacy `x-supabase-signature` (raw-body HMAC-SHA256 hex) is honored as a fallback for pre-GA hooks.
- Routes to the correct template based on `email_action_type`.
- Constructs confirmation URL: `{APP_URL}/auth/confirm?token_hash=...&type=...&next=...`

**Troubleshooting signup errors:**

| Error message (returned to client) | Cause | Fix |
|---|---|---|
| `Hook requires authorization token` | Supabase project has the Send Email hook enabled but its secret is blank server-side | Dashboard → Auth → Hooks → Send Email → regenerate secret; copy to Vercel `SUPABASE_HOOK_SECRET`; redeploy |
| `Email rate limit exceeded` | Hit Supabase's per-project email rate limit (default 2/hr on built-in SMTP) or the per-email signup throttle (~60s between attempts for the same address) | Enable Custom SMTP toggle (step 5 above) + raise Rate Limits "emails per hour" (step 6). For the per-email throttle, test with a fresh email or wait ~60s. |
| `Unauthorized` (from `/api/auth/send-email` directly in logs) | Vercel's `SUPABASE_HOOK_SECRET` doesn't match the value in the Supabase dashboard hook config | Re-copy the secret from Supabase dashboard into Vercel and redeploy |

**Emails sent:**

| Email | Trigger | Template location |
|---|---|---|
| Signup confirmation | Supabase Send Email hook (`signup`) | `src/lib/email/auth-emails.ts → sendSignupConfirmation` |
| Password reset | Supabase Send Email hook (`recovery`) | `src/lib/email/auth-emails.ts → sendPasswordReset` |
| Email change confirmation | Supabase Send Email hook (`email_change`) | `src/lib/email/auth-emails.ts → sendEmailChange` |
| Magic link sign-in | Supabase Send Email hook (`magiclink`) | `src/lib/email/auth-emails.ts → sendMagicLink` |
| Booking confirmation (to client) | Stripe webhook on `checkout.session.completed` | `src/lib/email/resend.ts → sendBookingConfirmation` |
| New booking alert (to Rachel) | Same webhook | `src/lib/email/resend.ts → sendAdminBookingAlert` |
| Contact form submission (to Rachel) | `POST /api/contact` | `src/lib/email/resend.ts → sendContactFormSubmission` (sets `replyTo` to the submitter) |
| Weekly job digest (to subscribers) | cron-job.org every Monday 9AM UTC | `src/app/api/cron/job-alerts/route.ts` — inline plain text |
| Newsletter welcome | `POST /api/newsletter` (first-time signup) | `src/lib/email/newsletter-welcome.ts → sendWelcomeEmail` |
| Newsletter weekly issue | `/api/cron/newsletter-send` (hourly) → `sendIssue` | `src/lib/email/newsletter-send.ts` + `newsletter-render.ts` + `newsletter-template.ts` |
| Newsletter test send (preview) | `POST /api/admin/newsletter/test-send` | Same renderer with placeholder values |
| Newsletter re-engagement | `/api/cron/newsletter-reengage` weekly | `src/lib/email/newsletter-reengagement.ts → sendReengagementEmail` |
| Newsletter milestone (6 mo / 1 yr) | `/api/cron/newsletter-milestones` daily | `src/lib/email/newsletter-reengagement.ts → sendMilestoneEmail` |
| Unsubscribe feedback (to Rachel) | `POST /api/newsletter/feedback` from unsubscribe page | Plain text email via `resend.emails.send` |

### Resend webhook (newsletter tracking)

**Endpoint to register in Resend:** `https://thryvegrowth.co/api/webhooks/resend`

**Events to enable:** `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

**Handler:** `src/app/api/webhooks/resend/route.ts` — verifies Svix signature using `RESEND_WEBHOOK_SECRET` (HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${body}`), upserts into `newsletter_events` keyed by `resend_event_id` (idempotent under retries), and updates the subscriber's `last_engaged_at` on `opened`/`clicked` or `unsubscribed_at` on `bounced`/`complained`.

**Newsletter sending pipeline:** Issues are rendered once per send via Tiptap → HTML (`@tiptap/html` with `newsletterRenderExtensions`), wrapped in the brand HTML shell (`src/lib/email/newsletter-template.ts`), then sent in batches of 100 via `resend.batch.send(...)` with a 1.1s pause between batches to stay under Resend's 10 req/s default rate limit. Each recipient gets a tokenized unsubscribe URL substituted into placeholders, plus `List-Unsubscribe` + `List-Unsubscribe-Post` headers (RFC 8058) so Gmail's native one-click unsubscribe works.

**Lazy Proxy singleton:** Same pattern as Stripe — defers `new Resend(...)` until first access to avoid build failures.

**Graceful degradation:** Email failures in the Stripe webhook are caught by `Promise.allSettled` — the booking record is still created even if the email fails. The job-alerts cron logs errors but continues to the next subscriber. The newsletter send pipeline marks batches as failed in `newsletter_sends.status` but continues processing remaining batches; only marks the whole issue `'failed'` if zero batches succeed.

---

## GoHighLevel

**What it does:** CRM contact syncing. When clients sign up or book, their contact is upserted into GoHighLevel for follow-up and nurture campaigns.

**Client file:** `src/lib/gohighlevel/client.ts`

**Env vars:**
- `GHL_API_KEY` — GoHighLevel API key
- `GHL_LOCATION_ID` — GoHighLevel location/sub-account ID

**Where to get credentials:** GoHighLevel → Settings → Integrations → API Key; Location ID is in the URL of your sub-account dashboard

**API endpoint used:** `POST https://rest.gohighlevel.com/v1/contacts/upsert`

**Sync triggers and tags:**

| Trigger | Tags applied | Where in code |
|---|---|---|
| Booking checkout completed | `thryve-client`, `booked`; stores service type in custom field | `src/lib/gohighlevel/client.ts → syncBookingToGHL` |
| Newsletter form submitted | `thryve-newsletter` | `src/lib/gohighlevel/client.ts → syncNewsletterSubscriber` |

**Graceful degradation:** If `GHL_API_KEY` or `GHL_LOCATION_ID` are not set, the sync functions log a console warning and return early. Bookings and newsletter signups continue to work normally. This means you can run the app locally without GHL credentials.

---

## JSearch via RapidAPI

**What it does:** Provides live job search results when Rachel clicks "Fetch from JSearch" on a client's watchlist page.

**Client file:** `src/lib/job-api/jsearch.ts`

**Env vars:**
- `RAPIDAPI_KEY` — RapidAPI API key

**Where to get credentials:** RapidAPI → Subscribe to JSearch → My Apps → your key

**API host:** `jsearch.p.rapidapi.com`

**How it works:**
1. Reads the client's `target_roles` (first 3) and `locations[0]` from their watchlist profile
2. Builds a search query string and calls the JSearch `/search` endpoint
3. Results are normalized via `normalizeJob()` to match `job_listings` table shape
4. Descriptions are truncated to 2000 chars for storage
5. Results are deduplicated against existing `external_id` values before inserting
6. Newly inserted jobs are automatically assigned to the client as matches with `status = 'new'`

**Caching:** Responses are cached 1 hour via `next: { revalidate: 3600 }` on the `fetch` call.

**Rate limits:** Depends on your RapidAPI subscription tier. The basic (free) tier is limited — upgrade if hitting rate limits in production.

**Graceful degradation:** If `RAPIDAPI_KEY` is not set, `searchJobs()` logs a warning and returns an empty array. Rachel will see "Fetched 0 jobs" — the app does not crash.

---

## Job-source adapters (automated feed)

**What it does:** Powers the automated `/api/cron/job-feed` (and is extensible to new boards). Each source implements the `JobSource` contract in `src/lib/job-api/types.ts` (`search()` → rows already normalized to the `job_listings` shape).

**Registry:** `src/lib/job-api/sources.ts` — `ALL_SOURCES` maps a key → adapter; `getEnabledSources()` returns the intersection of registered adapters and the `job_sources` table rows where `enabled = TRUE` (falls back to JSearch if the table is empty/unreadable).

**Ingest pipeline:** `src/lib/job-api/ingest.ts → ingestForClient(clientId, profile, sources)` — fetches across sources, dedups by `external_id` (within the batch and against existing `job_listings`), inserts new listings, scores each via `src/lib/matching/score.ts`, upserts matches ≥ 60, and notifies the client (`new_job_match` in-app + email) for genuinely-new matches.

**Admin toggle:** `/admin/integrations → Automated Job Sources` (component `JobSourceCard`, action `toggleJobSource`) flips `job_sources.enabled`.

**Shipped adapters:**

| Key | File | Env vars | Notes |
|---|---|---|---|
| `jsearch` | `src/lib/job-api/jsearch.ts` (`jsearchSource`) | `RAPIDAPI_KEY` | Aggregates LinkedIn/Indeed/ZipRecruiter/Google data. Enabled by default. |
| `usajobs` | `src/lib/job-api/usajobs.ts` (`usajobsSource`) | `USAJOBS_API_KEY`, `USAJOBS_USER_AGENT` | Official federal board. Off until keys are set. Register at developer.usajobs.gov; `USAJOBS_USER_AGENT` is the email you registered with (sent as the `User-Agent` header). Graceful-degrades to `[]` without keys. |

---

## Vercel

**What it does:** Hosting, CI/CD, edge functions, and analytics. Scheduled jobs live on cron-job.org (see next section) to stay within Vercel Hobby limits.

**Analytics:**
- `@vercel/analytics/next` is installed and the `<Analytics />` component is added to the root layout (`src/app/layout.tsx`)
- No configuration required — automatically activates when deployed to Vercel
- View analytics at `vercel.com` → your project → Analytics tab
- Vercel Analytics is always on (no consent gate) — it doesn't drop tracking cookies, just an aggregate page-view counter

**Env vars (Vercel-specific):**
- `CRON_SECRET` — Any secret string; set in Vercel → Project → Environment Variables. The same value must be configured as a custom `Authorization: Bearer {CRON_SECRET}` header on every cron-job.org job.

**Deployment:** Push to the main branch triggers automatic deployment. No manual steps.

---

## cron-job.org

**What it does:** Free external scheduler. Pokes our `/api/cron/*` endpoints on a schedule by sending HTTPS GET requests with a Bearer token header. Replaces Vercel Cron so the project stays on the Vercel Hobby tier.

**Why external:** Vercel Hobby caps cron jobs aggressively; cron-job.org's free tier allows up to 50 jobs with minute-level granularity — comfortably covers our 9.

**Auth model:** Every cron route handler still calls `isAuthorized(request)` from `src/lib/cron/auth.ts`. That helper compares the `Authorization` header to `Bearer ${CRON_SECRET}`. cron-job.org sends the same header on every job invocation. Locally, with no `CRON_SECRET` set, the endpoint allows all requests (dev-safe).

**Function timeout:** The Vercel Hobby plan caps function execution at 10 seconds. All current jobs finish well inside that. If a job ever exceeds it, split the work or upgrade the Vercel plan — cron-job.org just retries on failure.

### Cron inventory (source of truth)

All schedules are UTC. The right column shows the local Central time, which shifts by 1 hour across US DST.

| Endpoint | UTC cron | Local Central time |
|---|---|---|
| `GET /api/cron/job-alerts` | `0 9 * * 1` | Mon 3am CDT / 4am CST |
| `GET /api/cron/newsletter-send` | `0 * * * *` | Hourly at :00 |
| `GET /api/cron/newsletter-reengage` | `0 14 * * 3` | Wed 9am CDT / 8am CST |
| `GET /api/cron/newsletter-milestones` | `0 14 * * *` | Daily 9am CDT / 8am CST |
| `GET /api/cron/intake-reminders` | `0 14 * * *` | Daily 9am CDT / 8am CST |
| `GET /api/cron/intake-overdue-alert` | `0 15 * * *` | Daily 10am CDT / 9am CST |
| `GET /api/cron/session-reminders` | `0 * * * *` | Hourly at :00 |
| `GET /api/cron/auto-complete-sessions` | `30 * * * *` | Hourly at :30 |
| `GET /api/cron/post-service-followup` | `0 16 * * *` | Daily 11am CDT / 10am CST |
| `GET /api/cron/extend-availability` | `0 11 * * *` | Daily 6am CDT / 5am CST |
| `GET /api/cron/job-feed` | `0 8 * * *` | Daily 3am CDT / 2am CST — automated multi-source ingest + score + assign, `JOB_FEED_BATCH` clients/run (least-recently-fed first) |
| `GET /api/cron/application-reminders` | `0 14 * * *` | Daily 9am CDT / 8am CST — T+7/14/30 nudges after a job is marked applied |

> **`job-feed` runs free on Vercel Hobby.** Each invocation processes only `JOB_FEED_BATCH` clients (default 5, env-tunable), ordered by `watchlist_profiles.last_feed_at` (oldest/never-fed first), and stamps `last_feed_at` after each. So a daily run rotates through everyone over `ceil(active_clients / BATCH)` days, then keeps refreshing — staying well under Hobby's 10s function cap and keeping external API usage low. With both JSearch **and** USAJOBS enabled, set `JOB_FEED_BATCH=3`. Fully idempotent (dedup + `ON CONFLICT DO NOTHING`); the cursor advances even on a per-client error so nothing blocks the queue.

### Setting up a new job on cron-job.org

For each endpoint above:

1. cron-job.org → **Create cronjob**
2. **Title**: copy the endpoint path (e.g., `Thryve – intake-reminders`)
3. **URL**: `https://thryvegrowth.co/api/cron/<endpoint>` (production only; local dev still works without a `CRON_SECRET`)
4. **Schedule**: paste the cron expression from the inventory table; confirm the timezone selector is **UTC**
5. **Request method**: `GET`
6. **Advanced → Headers**: add one header
   - Name: `Authorization`
   - Value: `Bearer <CRON_SECRET>` (paste the actual secret — same value as Vercel → Settings → Environment Variables → `CRON_SECRET`)
7. **Advanced → Notifications**: enable failure notifications to Rachel's email
8. **Save & enable**
9. Use the **Test execution** button to confirm `200 OK` before relying on the schedule

### Verification

- `curl -i https://thryvegrowth.co/api/cron/intake-reminders` (no header) → `401 Unauthorized`
- `curl -H "Authorization: Bearer $CRON_SECRET" https://thryvegrowth.co/api/cron/intake-reminders` → `200 OK` with JSON body
- Idempotency: invoking any reminder job twice in the same window is a no-op (enforced by `automation_log` UNIQUE constraints and per-row `*_sent_at` columns)

---

## Visitor Tracking Pixels

**What it does:** Lets Rachel run real visitor analytics + conversion tracking on the public marketing site. Six providers are supported out of the box; each is configured by pasting an ID into a card on `/admin/integrations` and flipping a toggle. Scripts only fire after the visitor accepts the cookie consent banner — see the consent gate in `src/components/tracking/TrackingScripts.tsx`.

**Provider catalog** (see `src/lib/tracking/scripts.ts` `PROVIDER_SCRIPTS` for the exact `<Script>` shape each one renders):

| Provider key | Name | Where to find the ID | Format |
|---|---|---|---|
| `google_analytics_4` | Google Analytics 4 | `analytics.google.com` → Admin → Data Streams → your stream → "Measurement ID" | `G-XXXXXXXXXX` |
| `google_tag_manager` | Google Tag Manager | `tagmanager.google.com` → top-right next to your account/container name | `GTM-XXXXXXX` |
| `meta_pixel` | Meta Pixel | `business.facebook.com` → Events Manager → your pixel → top of page | 15–16 digit number |
| `google_ads` | Google Ads | `ads.google.com` → Tools → Measurement → Conversions → conversion source | `AW-XXXXXXXXX` (optionally `AW-XXXXXXXXX/LABEL` for conversion-specific tags) |
| `linkedin_insight` | LinkedIn Insight | `linkedin.com/campaignmanager` → Analyze → Insight Tag → "Partner ID" | 7–8 digit number |
| `microsoft_clarity` | Microsoft Clarity | `clarity.microsoft.com` → your project → Settings → Setup → "Project ID" | ~10 character alphanumeric |

**Adding a new provider:** add an entry to `PROVIDER_SCRIPTS` in `src/lib/tracking/scripts.ts` (snippet + opt-out URL) and an `INSERT` row to the next migration. No other code changes needed — admin UI, public injection, and privacy disclosure are all data-driven.

**Cookie consent gate:** the `cookie_consent` localStorage key has three states — unset (banner visible), `"accepted"` (scripts fire), `"rejected"` (scripts stay off). `CookieConsent.tsx` writes the value and dispatches the `thryve:consent-change` custom event. `TrackingScripts.tsx` listens for both that and the cross-tab `storage` event so updates are immediate.

**Privacy policy stays in sync:** `/privacy` is now an async server component that lists every live pixel + a per-provider opt-out link, all sourced from the same `tracking_pixels` table. When Rachel toggles a pixel on or off, the privacy disclosure follows automatically — no doc edits required.

**Env vars:** none. Pixel IDs live in Postgres, not env vars.

**Graceful degradation:** if Supabase is unreachable or the `tracking_pixels` table doesn't exist yet (pre-migration), `TrackingPixels` renders nothing — the site stays up, just without tracking.
