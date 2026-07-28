# Environment Variables — Thryve Growth Co.

## Setup

1. Copy `.env.local.example` to `.env.local` in the project root
2. Fill in each variable (see the table below for where to get each value)
3. For production, set all variables in Vercel → Project Settings → Environment Variables
4. **Never commit `.env.local` to git** — it contains secrets

For local development, variables prefixed with `NEXT_PUBLIC_` are safe to expose to the browser. All others are server-only.

---

## Complete Reference

### Supabase

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Project Settings → API | Public anon key for client-side auth — safe for browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API | Service role key — bypasses RLS, server only, never expose |

### Stripe

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe → Developers → API Keys | Browser-safe publishable key for Stripe.js |
| `STRIPE_SECRET_KEY` | Yes | Stripe → Developers → API Keys | Server-side key for creating checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe → Developers → Webhooks → your endpoint | Signature secret to verify incoming webhook events |

### Stripe Price IDs

Create each product in the Stripe dashboard, then copy the price ID here. All price IDs are server-only.

| Variable | Required | Service | Price |
|---|---|---|---|
| `STRIPE_PRICE_COACHING_SINGLE` | Yes | Career & Leadership Coaching — Single Session | $125 |
| `STRIPE_PRICE_COACHING_PACKAGE` | Yes | Career & Leadership Coaching — 3-Session Package | $400 |
| `STRIPE_PRICE_INTERVIEW_SINGLE` | Yes | Interview Preparation — Single Session | $100 |
| `STRIPE_PRICE_INTERVIEW_PACKAGE` | Yes | Interview Preparation — 2-Session Package | $250 |
| `STRIPE_PRICE_RESUME_REVIEW` | Yes | Resume Review | $75 |
| `STRIPE_PRICE_RESUME_REWRITE` | Yes | Full Resume Rewrite | $200 |
| `STRIPE_PRICE_JOB_ALERTS` | Yes | Job Alerts & Watchlists — Monthly | $50/month (recurring) |
| `STRIPE_PRICE_HR_HOURLY` | Yes | HR Consulting — Hourly | $100/hr |
| `STRIPE_PRICE_HR_PROJECT` | Yes | HR Consulting — Project | $500+ |
| `STRIPE_PRICE_CULTURE` | Yes | Culture & Engagement Consulting | $750+ |

> **How price IDs are used:** All 10 vars are read in `src/lib/stripe/products.ts`. If a var is missing, that service gets a placeholder string (e.g., `"price_coaching_single"`) which Stripe will reject at checkout. All 10 must be set before going live.

### Email (Resend)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `RESEND_API_KEY` | Yes | Resend dashboard → API Keys | Sending transactional + newsletter emails |
| `RESEND_WEBHOOK_SECRET` | Yes (prod) | Resend dashboard → Webhooks → your endpoint → Signing secret | Verifies `POST /api/webhooks/resend` events (Svix HMAC-SHA256). If absent, the handler logs a warning and skips verification — fine for local dev only. |

### Newsletter

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `NEWSLETTER_BUSINESS_ADDRESS` | Yes (prod) | Rachel's business address | Rendered in every newsletter footer to satisfy CAN-SPAM. Example: `Thryve Growth Co. LLC · 123 Main St, Suite 200, Anywhere, ST 12345`. Defaults to `Thryve Growth Co. LLC · United States` if unset. |
| `NEWSLETTER_PUBLIC_URL` | No | Your deployed domain | Optional override for unsubscribe/manage link prefixes. Falls back to `NEXT_PUBLIC_APP_URL` then `https://thryvegrowth.co`. |

### Media (blog + newsletter image/GIF picker)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `GIPHY_API_KEY` | No* | developers.giphy.com → Create an App (free) → API Key | Powers the **GIFs** tab in the editor MediaPicker (`GET /api/media/gif`). |
| `UNSPLASH_ACCESS_KEY` | No* | unsplash.com/developers → New Application (free) → Access Key | Powers the **Photos** tab (`GET /api/media/image`) + the download-trigger ping. |

*Both are optional. If absent, the corresponding search tab shows a "not set up yet" notice; **Upload** (to the public `blog-images` bucket) and **URL** tabs always work without any key. Keys are used server-side only (never exposed to the browser).

### GoHighLevel (CRM)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `GHL_API_KEY` | No* | GoHighLevel → Settings → Integrations → API | CRM contact sync |
| `GHL_LOCATION_ID` | No* | GoHighLevel → your sub-account URL | CRM location for contact upsert |

*If either is absent, GHL sync is silently skipped. Bookings and newsletter signups still work. Set these before going live to enable CRM sync.

### Job Search (sources for the automated feed)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `RAPIDAPI_KEY` | No* | RapidAPI → My Apps → your key | JSearch job listing API (`jsearch` source) |
| `USAJOBS_API_KEY` | No** | developer.usajobs.gov → request an API key | USAJOBS.gov federal jobs (`usajobs` source) — `Authorization-Key` header |
| `USAJOBS_USER_AGENT` | No** | The email you registered at developer.usajobs.gov | Sent as the `User-Agent` header (USAJOBS requires it) |

*If absent, "Fetch from JSearch" and the `jsearch` feed source return 0 results. Manual job entry still works.
**If absent, the `usajobs` source graceful-degrades to 0 results. Enable the source in `/admin/integrations` only after both are set. The automated feed runs via `/api/cron/job-feed`.

| `JOB_FEED_BATCH` | No | — | Clients processed per `/api/cron/job-feed` run (default `5`). Keeps each run under Vercel Hobby's 10s cap. Set `3` if both JSearch + USAJOBS are enabled. |
| `EXPIRE_AFTER_DAYS` | No | — | Age fallback for `/api/cron/expire-matches` (default `45`). When a posting has no `closes_at` deadline, a `new`/`saved`/`interested` match expires once its `date_posted` is older than this many days. |

### Auth Hooks

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `SUPABASE_HOOK_SECRET` | Yes | Supabase → Authentication → Hooks → Send Email → secret | Verifies that incoming requests to `/api/auth/send-email` came from Supabase |

> **How to get it:** After registering the Send Email hook in the Supabase dashboard, copy the auto-generated secret and paste it here. If this var is missing, the hook endpoint returns 500 and auth emails will fail.

### Cron + App

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `CRON_SECRET` | Yes (prod) | Any random secret string | Protects all `/api/cron/*` endpoints (`job-alerts`, `job-feed`, `expire-matches`, `newsletter-send`, `newsletter-reengage`, `newsletter-milestones`, `intake-reminders`, `intake-overdue-alert`, `session-reminders`, `auto-complete-sessions`, `post-service-followup`, `application-reminders`, `extend-availability`) from unauthorized calls. Configure this same secret as a custom `Authorization: Bearer <value>` header on each cron-job.org job — see `docs/integrations.md`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed domain | Used in email links, Stripe redirect URLs |
| `ADMIN_EMAIL` | No | Rachel's preferred admin alert inbox | Recipient for ALL admin alerts — bookings, intake, client messages, and (via `notifyAdmin`/`sendAdminAlert`) every inbound lead/subscriber/client interaction. Defaults to `hello@thryvegrowth.co` if absent. |

### Service Agreement (Booking Clickwrap)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_CONTRACT_VERSION` | Yes | You choose (e.g., `2026-06-01`) | Version string recorded on every booking's `contract_version` column. Bump whenever the meaningful PDF terms change so older bookings stay tied to the agreement they actually saw. |

### Google Calendar OAuth

Required only if you want bookings to auto-generate calendar events with Google Meet links. Without these, the system gracefully degrades: bookings get `meet_link_pending=true` and Rachel pastes the meet link manually via the admin UI.

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | No | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | Same as above | OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | Your deployed app | Must exactly match the redirect URI registered in Google Cloud. Format: `https://thryvegrowth.co/api/integrations/google/oauth/callback` |
| `INTEGRATIONS_ENCRYPTION_KEY` | Yes (if Google OAuth used) | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | 32-byte AES key (64 hex chars) used to encrypt access/refresh tokens at rest in `admin_integrations` |

> **Google OAuth setup steps:**
> 1. In Google Cloud Console, enable the Google Calendar API
> 2. Create an OAuth 2.0 Client of type "Web application"
> 3. Add `https://thryvegrowth.co/api/integrations/google/oauth/callback` (and `http://localhost:3000/...` for dev) as Authorized redirect URIs
> 4. Copy the Client ID + Client Secret into the env vars above
> 5. Set the redirect URI to match exactly
> 6. Visit `/admin/integrations` and click Connect — Rachel does this once

> **`CRON_SECRET` notes:**
> - If absent in development, the cron endpoint allows all requests (intentional for local testing)
> - In production, this MUST be set. cron-job.org is configured to send `Authorization: Bearer <CRON_SECRET>` with every job invocation; the value on cron-job.org must match the Vercel env var exactly
> - Set the same value in both your `.env.local` (for testing) and in Vercel environment variables, then paste it again as the `Authorization` header value on each cron-job.org job
> - Generate a random string: `openssl rand -hex 32`

> **`NEXT_PUBLIC_APP_URL` examples:**
> - Local: `http://localhost:3000`
> - Production: `https://thryvegrowth.co`

### Features that intentionally need no env vars

These shipped features were built so they require **zero** new configuration — there is nothing to add here for them:

- **"Draft with ChatGPT" AI assist suite** (`src/lib/ai/prompts.ts` + `src/components/admin/AiAssistPanel.tsx`): bring-your-own-ChatGPT. The app only builds prompt text for the admin to copy into their own ChatGPT session and paste the result back — **no LLM API key, endpoint, or AI env var of any kind.** Do not add an `OPENAI_API_KEY` (or similar); the suite does not call any model server-side.
- **Analytics dashboard charts** (`/admin/analytics`, `recharts` + `src/lib/reporting/*`): charts render from data already in Supabase. `recharts` is a client-side charting library with no configuration; CSV exports (`/api/admin/analytics/{revenue,ltv,packages}/export`) and the date-range presets (`src/lib/reporting/range.ts`) read no env vars.

> The full `process.env` reference above is complete for all five shipped product phases — session packages, proposals, testimonials/goals, the AI assist suite, and analytics added no new environment variables.

---

## Adding a New Variable

When you add a new environment variable to the codebase:
1. Add it to `.env.local.example` with a placeholder value and a comment
2. Add it to this table
3. Set it in Vercel → Project Settings → Environment Variables for all environments (Production, Preview, Development)
4. Document where to get the value in the "Source" column
