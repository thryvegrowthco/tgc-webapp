# Testing Guide: Job Watchlist + Client Portal Features

Step-by-step manual testing for the features added in the Module A–D + onboarding pass. Plan ~30 minutes for a full run.

> **Audience:** developers running `npm run dev` locally. For Rachel's day-to-day workflow, see `rachel-admin-guide.md` instead.

---

## 0. One-time setup

### 0.1 Apply the three new migrations

The features won't work without these. Easiest: paste each into the Supabase SQL editor in order.

```
supabase/migrations/0006_leads.sql
supabase/migrations/0007_match_scoring.sql
supabase/migrations/0008_client_profiles.sql
```

Or, if your Supabase CLI is wired to this project:
```bash
cd /Users/dietz/Desktop/Apps/thryve-growth-co
npx supabase db push
```

**Verify they applied:**
```sql
-- in Supabase SQL editor
select column_name from information_schema.columns
where table_name = 'client_job_matches' and column_name in ('score', 'score_label');
-- should return 2 rows

select count(*) from leads;            -- should return 0
select count(*) from client_profiles;  -- should return 0
```

### 0.2 Confirm env vars

Already-required vars (check your `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY (test mode for testing)
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_JOB_ALERTS  (needed for billing test)
RESEND_API_KEY           (needed to actually receive emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
RAPIDAPI_KEY             (optional — only needed if testing JSearch fetch)
```

If `RESEND_API_KEY` is unset, lead-capture emails won't actually send, but the lead row will still be inserted and you'll see error logs.

### 0.3 Start the dev server

```bash
cd /Users/dietz/Desktop/Apps/thryve-growth-co
npm run dev
```

Note the port it picks — Next.js falls back to 3001 / 3002 / 3003 if 3000 is in use. The rest of this guide says `localhost:3000` but substitute whatever you see.

### 0.4 Have two accounts ready

- **Admin account** — yours. If you're not already admin:
  ```sql
  update profiles set role = 'admin' where email = 'your-email@example.com';
  ```
- **Test client account** — sign up via `/signup` with a different email. Use a `+test` alias of your real email if you want emails to actually arrive (e.g. `you+test@gmail.com`).

---

## 1. Lead capture + admin pipeline (Module A)

**Goal:** submit a lead from the public site, see it land in the admin CRM.

### Steps

1. **Sign out** (or open an incognito window). You're testing the public form.
2. Open `http://localhost:3000/services/job-alerts`.
3. Scroll to the **"Start My Watchlist"** section (also reachable by clicking **Get Started** in the pricing card — it should jump there via the `#start` anchor).
4. Fill out the form. Required: **Full name** + **Email**. Pick a Work arrangement, set a Timeline, leave a few fields blank to make sure optional fields work.
5. Click **Start My Watchlist**.

### Expected

- The form replaces with a "You're on the list" confirmation card (green check).
- If `RESEND_API_KEY` is set: the email address you used gets a thank-you email; `hello@thryvegrowth.co` gets a notification email.
- Server logs show no errors from `/api/leads`.

### Verify in admin

6. Sign back in as **admin**.
7. Open `/admin/leads`. Pipeline cards at the top show **New: 1**, others zero. Your lead is in the table.
8. Click the lead's name. The detail page shows everything you submitted plus a status pill ("New").
9. Change status: pick **Contacted** in the status dropdown. The page refreshes and `/admin/leads` count moves from New → Contacted.
10. Type a note in **Internal notes** ("Sent intro email"). Click **Save notes**. Reload — your note persists.

### Negative tests

11. As an unauthenticated user, try `/admin/leads` directly → should redirect to `/login`.
12. POST an empty body to the API:
    ```bash
    curl -X POST -H 'Content-Type: application/json' -d '{}' http://localhost:3000/api/leads
    # expected: 400 with {"ok":false,"error":"Full name is required"}
    ```

---

## 2. Onboarding wizard

**Goal:** new client signs in, completes the cross-service intake, admin sees it.

### Steps (as **client**)

1. Sign out, then sign up at `/signup` as a brand-new test client.
2. Verify your email if email auth is enabled, then log in.
3. Land on `/dashboard`. At the top, a **"Tell Rachel about you"** soft-prompt card with a sparkle icon.
4. Click the card. You're at `/dashboard/onboarding`.
5. **Step 1 — About you:** location, time zone, pronouns. Click **Continue**.
6. **Step 2 — Your work:** current role, company, industry, years of experience. Click **Continue**.
7. **Step 3 — Why you're here:** type a primary goal. Tick **two or three** services (e.g. Coaching + Resume + Watchlist). Click **Continue**.
8. **Step 4 — Working together:** preferred contact method, availability notes. **Optionally** attach a small PDF. Click **Finish**.

### Expected

- Browser redirects to `/dashboard?onboarded=1`.
- The "Tell Rachel about you" card is **gone**.
- If you uploaded a resume, it shows up under `/dashboard/documents` with category "Resume".

### Verify partial-save behavior

9. Click around the dashboard, then go back to `/dashboard/onboarding`. The wizard re-opens with all your previous answers prefilled, and the page heading reads **"Update your profile"** instead of "Welcome to Thryve."
10. Change one field (e.g. update your time zone), click through to step 4, click **Finish**. The change persists.

### Verify in admin

11. Switch back to your admin account.
12. Open `/admin/clients`, click into the test client.
13. A **"Client intake"** section appears between the header and bookings, showing every field you submitted, a "Completed on {date}" timestamp, and the services you ticked rendered as small pills.

### Negative test

14. Log in as a **second** client who hasn't done onboarding. Visit `/admin/clients/[id]` for that user (as admin). Dashed-border placeholder reads "Client hasn't completed intake yet."

---

## 3. Application tracker (Module C)

**Goal:** mark jobs as applied → interviewing → offer and watch them flow through the tracker.

### Prereq

You need at least one `client_job_matches` row for your test client. Easy options:

- **A.** Use the admin watchlists page: `/admin/watchlists/[clientId]` → use **Add Job Manually** in WatchlistManager to add a fake job. The flow auto-creates a match for that client.
- **B.** SQL stub:
  ```sql
  insert into job_listings (title, company, location, is_remote, source, is_active)
  values ('Senior Test Role', 'Test Co', 'Remote', true, 'manual', true)
  returning id;
  -- copy the returned id, then:
  insert into client_job_matches (client_id, job_id, status)
  values ('<your-test-client-uuid>', '<job-id-from-above>', 'new');
  ```

### Steps (as test **client**)

1. Open `/dashboard/watchlist`. Your job appears with status "New".
2. Use the inline status dropdown on the card → change to **Applied**.
3. Open `/dashboard/applications`.
4. Top stats row shows **Applied: 1**, others: 0. The job card appears under "Applied" with the yellow status badge.
5. Change status to **Interviewing** on the card. Page refreshes; the row moves to the "Interviewing" section, stats update.
6. Change to **Offer**. Moves to Offer section.
7. Change to **Not a Fit**. Moves to "Not a Fit". Active stats (Applied + Interviewing + Offer) all show 0; Not a Fit shows 1.
8. Verify the **Watchlist** page (`/dashboard/watchlist`) no longer shows this match — it's been removed from active pre-application stages.

### Negative test

9. With no applied/interviewing/offer/not-a-fit matches at all, the page shows the "No applications tracked yet" empty state with a **View watchlist** button. (Easiest way: create a fresh client with no matches.)

---

## 4. Auto-matching engine (Module B)

**Goal:** the scoring engine ranks jobs against a watchlist profile.

### Prereq

Test client needs:
- A completed watchlist profile (run `/dashboard/watchlist/setup` as the client and fill it out — at minimum target roles + remote preference).
- Some `job_listings` rows in the DB to score against. Easiest: use **Add Job Manually** in `/admin/watchlists/[clientId]` to add 3–4 jobs with varied titles. Make sure at least one job's title contains a keyword from the client's target roles (e.g. if target role is "Director of HR", create a job titled "Director of People Operations" — partial match).

### Steps (as **admin**)

1. Open `/admin/watchlists/[clientId]` for your test client.
2. Verify the **Client Preferences** section shows the target roles and other prefs you set.
3. Find the section **"Auto-match against existing jobs"** — there's a "Run auto-match" button on the right.
4. Click it. Expected:
   - Button shows "Scoring jobs..." briefly.
   - Toast appears: `Scored N jobs. Added M new matches.` (or "No new matches above threshold").
5. Scroll down to **Job Matches**. Any newly-added match shows a colored badge like **"85% · strong"** (green), **"70% · good"** (brand teal), or **"62% · maybe"** (gray) next to the status pill.
6. Click **Run auto-match** again immediately. Toast shows **0 new matches** (already-assigned jobs are skipped).

### Verify on client side

7. Sign in as the test client.
8. Open `/dashboard/watchlist`. The same matches show **"85% match"** badges next to the status pills.

### Spot-check the scoring

This is a sanity check that the math is reasonable, not full QA:

- A job whose title contains a target role keyword AND whose location matches AND has salary in your band should score in the **strong** tier (80+).
- A job that only matches the target role keyword in the description (not title) and has no location/salary fit should score **maybe** (60–64) or below threshold (excluded).
- A job that matches nothing (totally different role) should NOT appear as a match.

### Negative tests

9. As admin, click **Run auto-match** for a client whose watchlist profile has empty `target_roles`. Toast: `No target roles set on profile.` and no inserts.
10. Click for a client without any watchlist profile at all → toast: `No watchlist profile found.`

---

## 5. Billing self-service (Module D)

**Goal:** active subscriber can open the Stripe Customer Portal from `/dashboard/billing`.

This one needs **an actual Stripe subscription** in test mode to fully validate the portal redirect. Three paths from cheapest to most realistic:

### Path A: Real test checkout (most thorough)

1. Make sure `STRIPE_PRICE_JOB_ALERTS` in `.env.local` points to a Stripe **test-mode** price for a recurring product (`$15/mo`).
2. Sign in as the test client.
3. Go through whatever flow your site uses to start the watchlist subscription (the existing Stripe checkout for `job_alerts_monthly`).
4. Complete checkout with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC.
5. The webhook (`/api/webhooks/stripe`) populates `watchlist_profiles.stripe_subscription_id`. Verify in SQL:
   ```sql
   select client_id, subscription_status, stripe_subscription_id
   from watchlist_profiles
   where client_id = '<test-client-uuid>';
   ```
   You should see `subscription_status = 'active'` and a `stripe_subscription_id` starting with `sub_`.

### Path B: Stub the subscription (faster)

If you already have a test-mode subscription in your Stripe account that you can reuse:

```sql
insert into watchlist_profiles (client_id, subscription_status, stripe_subscription_id)
values ('<test-client-uuid>', 'active', 'sub_xxxxxxxxxx_from_stripe_dashboard')
on conflict (client_id) do update
set subscription_status = excluded.subscription_status,
    stripe_subscription_id = excluded.stripe_subscription_id;
```

### Path C: UI-only test (no real subscription)

Sign in as a client with no subscription → visit `/dashboard/billing`:
- Empty-state card, "No active subscription," with a "View Job Alerts" button linking to `/services/job-alerts`.

### Steps (with active subscription, paths A or B)

1. Sign in as the subscribed client.
2. Click **Billing** in the dashboard sidebar.
3. Expected: page shows a card with:
   - Service name (Job Alerts & Watchlists)
   - Status pill (green "Active")
   - **Plan**, **Next billing date** (e.g. "December 4, 2026"), **Status** rows
4. Click **Open Billing Portal**. Brief load, then redirect to a Stripe-hosted page on `billing.stripe.com/p/session/...`.
5. On the Stripe page: try **Cancel subscription**.
6. Click "Return to Thryve Growth Co." in the Stripe header → returns to `/dashboard/billing`.
7. Reload the page. Status pill now shows **"Cancelling"** (amber), and a sub-card appears: *"Subscription set to cancel — Your access continues through {date}."*

---

## 6. End-to-end smoke test

After all the above, do one quick sanity pass to confirm nothing regressed:

| Route | Expected |
|---|---|
| `/` | Hero + intro + how-we-work all render |
| `/services/job-alerts` | Page renders + lead form is visible mid-page |
| `/about` | "Hi, I'm Rachel." hero |
| `/investment` | New prices, "A Quick Note on Pricing", "Not Sure Where to Start?" CTA |
| `/dashboard` | Soft prompt visible (if onboarding incomplete), all 7 sidebar links work |
| `/admin` | Sidebar shows Leads; all admin pages load |

```bash
for r in / about services investment privacy terms resources packages services/job-alerts dashboard admin; do
  echo "/$r → $(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/$r)"
done
```

Auth-protected routes return **307**, public routes return **200**. Anything else (`500`, `404`) means something broke.

---

## Common gotchas

- **"Could not find the table 'leads'"** → migration `0006` not applied. See section 0.1.
- **"column client_job_matches.score does not exist"** → migration `0007` not applied.
- **"column client_profiles.client_id does not exist"** → migration `0008` not applied.
- **Lead form submits but no email arrives** → `RESEND_API_KEY` missing or invalid; check server console for `[/api/leads] notify Rachel failed:` logs. The lead row is still inserted.
- **Auto-match button does nothing** → either client has no watchlist profile, no target roles set, or no jobs in the DB. Toast will tell you which.
- **Billing portal redirect fails with "No such customer"** → the `stripe_subscription_id` you stubbed isn't a valid test-mode subscription, or your `STRIPE_SECRET_KEY` is in live mode while the sub is in test mode. Subscriptions and keys must be in the same mode.
- **Onboarding resume upload fails silently** → the file must be PDF or `.doc`/`.docx`, ≤25MB. Server returns `{error: "..."}` which the wizard surfaces inline.
