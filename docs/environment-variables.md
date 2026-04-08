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
| `RESEND_API_KEY` | Yes | Resend dashboard → API Keys | Sending transactional emails |

### GoHighLevel (CRM)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `GHL_API_KEY` | No* | GoHighLevel → Settings → Integrations → API | CRM contact sync |
| `GHL_LOCATION_ID` | No* | GoHighLevel → your sub-account URL | CRM location for contact upsert |

*If either is absent, GHL sync is silently skipped. Bookings and newsletter signups still work. Set these before going live to enable CRM sync.

### Job Search (JSearch via RapidAPI)

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `RAPIDAPI_KEY` | No* | RapidAPI → My Apps → your key | JSearch job listing API |

*If absent, "Fetch from JSearch" returns 0 results. Manual job entry still works. Set this to enable automated job fetching.

### Cron + App

| Variable | Required | Source | Purpose |
|---|---|---|---|
| `CRON_SECRET` | Yes (prod) | Any random secret string | Protects `/api/cron/job-alerts` from unauthorized calls |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed domain | Used in email links, Stripe redirect URLs |

> **`CRON_SECRET` notes:**
> - If absent in development, the cron endpoint allows all requests (intentional for local testing)
> - In production, this MUST be set. Vercel automatically sends it as `Authorization: Bearer {CRON_SECRET}` with cron requests
> - Set the same value in both your `.env.local` (for testing) and in Vercel environment variables
> - Generate a random string: `openssl rand -hex 32`

> **`NEXT_PUBLIC_APP_URL` examples:**
> - Local: `http://localhost:3000`
> - Production: `https://thryvegrowth.co`

---

## Adding a New Variable

When you add a new environment variable to the codebase:
1. Add it to `.env.local.example` with a placeholder value and a comment
2. Add it to this table
3. Set it in Vercel → Project Settings → Environment Variables for all environments (Production, Preview, Development)
4. Document where to get the value in the "Source" column
