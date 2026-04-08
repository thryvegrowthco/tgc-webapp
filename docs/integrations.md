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
- Password reset email links also go through `/auth/callback?next=/dashboard/profile`

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

**Lazy Proxy singleton:** The Stripe client is wrapped in a JavaScript `Proxy` that defers `new Stripe(...)` until first access. This prevents `next build` from failing when `STRIPE_SECRET_KEY` is not set in the build environment.

**Adding a new service:**
1. Create the product and price in Stripe dashboard
2. Add the price ID env var to Vercel and `.env.local`
3. Add a new `ServiceKey` in `src/lib/stripe/products.ts`
4. Add the entry to the `SERVICES` record and `SERVICE_SELECT_OPTIONS` array
5. If the service requires a calendar slot, add it to `BOOKABLE_SERVICES`
6. Update `docs/environment-variables.md` with the new var

**Graceful degradation:** None — payments are core functionality.

---

## Resend

**What it does:** Sends all transactional emails — booking confirmations, admin alerts, and the weekly job digest.

**Client file:** `src/lib/email/resend.ts` (lazy Proxy singleton + email send functions)

**Env vars:**
- `RESEND_API_KEY` — API key from Resend dashboard

**Where to get credentials:** Resend dashboard → API Keys

**From address:** `Thryve Growth Co. <hello@thryvegrowth.co>` — must be a verified domain in Resend
**Admin alert address:** `hello@thryvegrowth.co`

**Emails sent:**

| Email | Trigger | Template location |
|---|---|---|
| Booking confirmation (to client) | Stripe webhook on `checkout.session.completed` | `src/lib/email/resend.ts → sendBookingConfirmation` |
| New booking alert (to Rachel) | Same webhook | `src/lib/email/resend.ts → sendAdminBookingAlert` |
| Weekly job digest (to subscribers) | Vercel Cron every Monday 9AM UTC | `src/app/api/cron/job-alerts/route.ts` — inline plain text |

**Lazy Proxy singleton:** Same pattern as Stripe — defers `new Resend(...)` until first access to avoid build failures.

**Graceful degradation:** Email failures in the Stripe webhook are caught by `Promise.allSettled` — the booking record is still created even if the email fails. The cron logs errors but continues to the next subscriber on failure.

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

## Vercel

**What it does:** Hosting, CI/CD, edge functions, analytics, and scheduled cron jobs.

**Analytics:**
- `@vercel/analytics/next` is installed and the `<Analytics />` component is added to the root layout (`src/app/layout.tsx`)
- No configuration required — automatically activates when deployed to Vercel
- View analytics at `vercel.com` → your project → Analytics tab

**Cron jobs:**
- Configured in `vercel.json` at the project root
- Current schedule: `0 9 * * 1` = every Monday at 9:00 AM UTC
- Endpoint: `GET /api/cron/job-alerts`
- Vercel sends `Authorization: Bearer {CRON_SECRET}` with every cron request
- `CRON_SECRET` must be set in Vercel project settings (env var); if absent locally, the endpoint allows all requests (dev-safe)
- To test locally, call the endpoint manually with the `Authorization` header

**Env vars (Vercel-specific):**
- `CRON_SECRET` — Any secret string; set in Vercel → Project → Environment Variables

**Deployment:** Push to the main branch triggers automatic deployment. No manual steps.
