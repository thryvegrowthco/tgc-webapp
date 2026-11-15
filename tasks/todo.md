# Checkout creates account (feat/checkout-creates-account)

Owner decision (2026-10-27): when someone pays at checkout and has no account,
the signature-verified Stripe webhook must auto-create a `client` account and
email them a secure setup link. Public /signup stays closed.

## Plan

- [x] Map current flow (webhook, booking, onboarding, invitation, finalize, emails, trigger)
- [ ] Shared helper `src/lib/auth/provision-client.ts`
  - `ensureClientAccount(email, fullName)` -> `{ clientId, isNew, error? }`
    - case-insensitive lookup by profiles.email; create via `admin.createUser({ email_confirm:true })`
    - race-tolerant (email_exists -> re-read, isNew=false); role always 'client', never admin
  - `sendCheckoutAccountWelcome(email, fullName, { serviceType, amountFormatted })` -> boolean
    - generates a `recovery` link via admin.generateLink, sends ONE welcome email, never logs the link
- [ ] New branded email `sendCheckoutWelcome` in `src/lib/email/auth-emails.ts` (mirrors sendClientInvite + receipt context)
- [ ] Webhook `src/app/api/webhooks/stripe/route.ts`
  - `handleCheckoutCompleted` (bookings + packages): ensure account when no userId; link booking/payment/package; welcome if new
  - `handleInvitationCheckoutCompleted`: ensure account when invitation.client_id null; pass clientId to finalizeSession; welcome if new
  - `handleProposalCheckoutCompleted`: ensure account when proposal.client_id null; link proposal + payment; welcome if new
  - Fail-safe: account failure never loses the booking; alert admin (reuse notifyAdmin subscription_issue)
- [ ] Customer copy: proposal accepted page, invitation confirmed page (+ email is authoritative)
- [ ] Docs: workflows.md, developer-architecture.md, rachel-admin-guide.md, admin-faq.md, admin-email-reference.md
- [ ] `npm run generate:help`
- [ ] Checks: tsc, eslint, check:og, check:emdash
- [ ] Req 6 (FAQ revisions): ALREADY SATISFIED in repo — data.ts says "two rounds of revisions"; surface, do not fabricate.

## Review (done)

- All items implemented and committed (5 commits on `feat/checkout-creates-account`).
- Checks green: `tsc --noEmit`, `eslint` (changed files), `check:og`, `check:emdash`, `generate:help`.
- Req 6 (FAQ revisions): NO change made — repo already says "two rounds of revisions" everywhere (git shows data.ts was created with "two"; `-S "one additional revision"` finds nothing). Surfaced, not fabricated.
- No webhook unit tests / test framework exist; the only related scripts are live-DB `.mts` walks (need `.env.local` + write to the live DB) and `tsx` is absent, so none could be run here. Recommend the owner extend `scripts/test-booking-walk.mts` / `test-proposal-walk.mts` to cover the account path.
- No DB migration added (existing `handle_new_user` trigger + reused `subscription_issue` notification type).

## Decisions / rationale
- Create with `email_confirm:true` + `recovery` link = requirement 1 ("email confirmed, no password") + requirement 2 ("generateLink recovery/magic link").
- Welcome email lives in auth-emails.ts (same family as the invited-client email) = "prefer whatever the codebase already does for invited clients"; no new EmailTemplateKey/DB migration.
- Idempotency: handlers short-circuit on replay (unique stripe_session_id on bookings/packages; invitation.booking_id; proposal.status=paid) AND welcome gated on isNew, so a replay never double-creates or double-emails.
- No DB migration needed (profiles row created by existing handle_new_user trigger; reuse existing admin_notifications type).

---

## Newsletter cron 500 — 2026-09-12 (incident + hardening)

Full plan: `~/.claude/plans/my-newsletter-cron-is-eager-clover.md`.

**Trigger:** cron-job.org reported `GET /api/cron/newsletter-send` → 500 at 2026-09-12 00:00:06 GMT.

**Finding: nothing was lost.** Verified against production — all 17 issues `sent`, zero
`newsletter_sends` rows on 09-12, nothing due at that tick, and the 09-15 14:00 issue sent 8s
after schedule. It was an **idle no-op tick that should have returned 200**.

**Root cause (most probable):** a transient Supabase/PostgREST error hit the route's graceful
`if (error)` 500 branch. `newsletter-send` was the *only* hourly cron that converted a query
error into a 500 — `session-reminders` shares the same `0 * * * *` tick but discards `error`
entirely, which is why exactly one failure email arrived. postgrest-js defaults to
`shouldThrowOnError=false` and returns fetch failures as an `error` object, so a 2-3s blip
produces precisely this signature. Secondary candidate: an uncaught throw in the proxy
middleware, which ran on `/api/*` and made an unguarded Supabase Auth network call per tick.
Ruled out: missing env vars — `NEXT_PUBLIC_*` are compile-time inlined into the server bundle
(verified in `.next/server`), and no deploy occurred on 09-12.
The exact error is unrecoverable: Vercel runtime logs aged out, and the route logged nothing.

### Changes
- [x] `src/proxy.ts` — matcher now excludes `api/`; `updateSession` failures degrade to
      `user: null` (fails closed) instead of a `MIDDLEWARE_INVOCATION_FAILED` 500.
- [x] `src/app/api/cron/newsletter-send/route.ts` — rebuilt on the `job-feed` pattern: shared
      `isAuthorized`, whole body guarded, `maxDuration` 300 → 60 (Hobby clamps anyway), one
      `newsletter_send_run` row in `automation_log` per run, stale-lock reclaim, and **500 only
      when a due issue failed to send**.
- [x] `src/lib/email/newsletter-send.ts` — check `resend.batch.send`'s `result.error` and the
      acknowledged-id count (the SDK resolves `{data:null,error}` and never throws, so a
      401/403/429 was being written to the ledger as a successful delivery); release the
      `sending` lock on any throw; stamp `last_sent_at` on the subscribers actually delivered
      to rather than `slice(0, sentCount)`; `markIssueFailed` keeps the real `failed_count`.
- [x] `package.json` — declare `happy-dom` (an undeclared peer of `@tiptap/html`, top-level
      imported by the render path; if a lockfile regen dropped it, every request to this route
      would 500 at module load).
- [x] Docs: `integrations.md`, `workflows.md` §7c, `developer-architecture.md`,
      `database-schema.md`, `rachel-admin-guide.md`, `admin-faq.md`; help center regenerated.
      Corrected two false claims: "every cron route imports the shared auth helper" (3 still
      don't) and "Hobby caps functions at 10 seconds" (it's 60).

### Verification (all run)
- [x] `tsc --noEmit` clean; eslint clean on changed files; `next build` succeeds.
- [x] Compiled `functions-config-manifest.json` confirms the middleware no longer matches any
      `/api/*` path, and still matches `/dashboard`, `/admin`, `/login`, `/`.
- [x] Idle tick → `200 {checked:0}` + a `newsletter_send_run` / `skipped` row in `automation_log`.
- [x] Stale-lock reclaim: issue stuck at `sending` with a 20-min-old `updated_at` → `reclaimed:1`,
      flipped back to `scheduled`, zero sends created.
- [x] Negative test: the same issue with a *fresh* `updated_at` → `reclaimed:0`, left at `sending`.
      (The sweep discriminates; it doesn't just always fire.)
- [x] Resend premise proven against the live API: `batch.send` with a bad key **resolves** to
      `{data:null,error:{statusCode:401,...}}` and does not throw. Old code would have recorded
      it as a delivered send; the new check catches it on both guards.
- [x] Production ledger audit: all 189 `newsletter_sends` rows carry a real Resend message id,
      so the silent-failure bug had never actually fired.

### Still outstanding
- [ ] After deploy: no-auth probe of `/api/cron/newsletter-send` must still 401; then an
      authenticated call should return `200 {checked:0}` and log a row.
- [ ] `job-alerts`, `newsletter-milestones`, `newsletter-reengage` still carry a private copy of
      `isAuthorized` (no `?now=` dry-run hook).
- [ ] `newsletter-milestones` / `newsletter-reengage` record nothing, so they have no idempotency
      guard — the same subscribers can be re-emailed every run.
- [ ] `NewsletterIssueForm.tsx` computes the default schedule in browser-local time but saves it
      as Central, shifting the hour for any admin outside Central.

### Rebased onto main (2026-11-14)
- Rebased from `675863a` onto `73d47a7`. `main` had not touched `route.ts`, `newsletter-send.ts` or `proxy.ts` since the branch point, so the code applied unchanged. Conflicts were limited to docs, the generated help content and this file.
- Kept main's wording wherever #7 (job-feed, merged 2026-09-22) had rewritten the same lines: the job-feed rows in `developer-architecture.md` and `integrations.md`, and `JOB_FEED_BATCH` in `environment-variables.md`.
- `integrations.md`: kept this fix's two new paragraphs (private `isAuthorized` copies, `/api/*` skips the proxy) and main's "Timeouts" section. Left out this fix's "Function timeout: 60 seconds" paragraph, which that section replaces.
- `maxDuration` is back at 300 (separate follow-up commit). The 300 to 60 change above assumed Hobby clamps at 60s; #7 established that the project runs on Fluid compute, where 300s is honoured. The same applies to the "it's 60" correction listed under Docs above.
- Re-run after the rebase: `tsc --noEmit` clean; eslint clean on the three changed source files; `next build` succeeds, including the em dash and preview-image checks; the built middleware matcher skips `/api/*` and still matches `/dashboard`, `/admin`, `/login`, `/`.
- Not re-run after the rebase: the live checks under Verification (idle tick, stale-lock reclaim, Resend bad-key probe). `.env.local` points at the live database, so they need a deliberate run.
- Still true on today's main: `job-alerts`, `newsletter-milestones` and `newsletter-reengage` carry a private copy of `isAuthorized`.
- Found in review, fixed in the next section: the stale-lock reclaim puts a killed send back to `scheduled`, and `sendIssue` did not skip subscribers already in `newsletter_sends` for that issue. A send killed after some batches went out would have reached those subscribers twice on the retry.

### Retry resumes instead of resending (2026-11-14)
- `newsletter-send.ts`: before sending, `deliverIssue` reads `newsletter_sends` for the issue (paged, 1000 rows a request) and drops every recipient that already has a row that is not `failed`. Failed rows are tried again.
- Counts cover the whole issue: `sent_count` is earlier deliveries plus this run, and an issue with earlier deliveries is not marked `failed` just because the resumed batches failed (it is `sent` with a `failed_count`, like any partly failed send). `last_sent_at` is stamped for the skipped subscribers too, since the killed run never got that far.
- If the ledger cannot be read the send stops and the issue is marked `failed`, the same handling as a failed recipient load: sending blind could deliver twice.
- `SendIssueResult` gained `skipped`; the cron puts it in each issue's entry in the `newsletter_send_run` payload.
- Verified offline against a fake PostgREST and a fake Resend on 127.0.0.1, with every other outgoing request refused and no `.env.local` loaded, so nothing live was touched. First run of 250: unchanged. Retry of 1,250 with 1,100 delivered and 50 failed: sends exactly the 150 outstanding, issue total 1,250, ledger read in two pages. Everyone already reached: the issue closes as sent without sending. Unreadable ledger: nothing sent, issue `failed`. Retry during an email outage: the earlier 100 stay in `sent_count`. Control: the same retry on the previous code sent 1,250 emails, 1,100 of them repeats. The harness was a throwaway and is not in the repo.
- `tsc --noEmit` clean; eslint clean on the two changed source files; `next build` succeeds.
- Not verified: the same retry against the real database and Resend.
- Closed in the next section: a run killed between Resend accepting a batch and the ledger insert for that batch leaves no row, so that batch (at most 100 people) was sent again on the retry.
- Not covered: an issue that ends `failed` has no resume path in `src/app/actions/newsletter.ts` (the lock only accepts draft, pending approval and scheduled). Duplicating it makes a new issue with an empty ledger, which sends to everyone.
- Fixed in the next section: the recipient load was a single request, so a list above Supabase's default 1000-row page was cut off at 1000; and `last_sent_at` was stamped with one `.in()` over every delivered id, which is too long for the request URL on a big list.

### Idempotent batches and a paged recipient list (2026-11-15)
- `newsletter-send.ts`: every `resend.batch.send` call carries an idempotency key, `newsletter-issue/<issue id>/<sha256 of the batch's subscriber ids>`. Resend keeps a key for 24 hours and answers a repeat of the same key and body with the original response without sending. A retry after a run that was killed between Resend accepting a batch and the ledger insert gets that response back, writes the missing ledger rows and sends nothing twice.
- Recipients are sorted by `subscribed_at` (then id) before batching, so a retry cuts the same batches as the run it resumes: ledgered batches drop out whole and new subscribers land at the end.
- Same key with a different body returns 409 `invalid_idempotent_request`: the batch is recorded `failed` with a message saying an earlier run already submitted it, and nothing is sent.
- The recipient load is paged, 1000 rows a request, each page starting after the last id of the one before. `last_sent_at` is stamped 100 ids a request, and a failed stamp is now logged.
- Verified offline against a fake PostgREST and a fake Resend on 127.0.0.1 that keeps idempotency keys the way Resend documents them, with every other outgoing request refused and no `.env.local` loaded, so nothing live was touched. Send of 450 killed after Resend took batch 3 and before its ledger rows: the retry presents batch 3 under the same key, nothing is sent for it, all 450 end with exactly one copy and the ledger holds the original message ids. Same with a subscriber joining in between: no repeats, the newcomer gets one copy. Same with a recipient of batch 3 renamed in between: 409, batch recorded failed, no second copy. 2,300 active subscribers: read in pages of 1000, 1000 and 300, all sent once, stamped in 23 requests. Interest-targeted issue: the filter is on every page. The resume checks from the previous section still pass. 28 checks in all. Control on the previous code: the killed send repeated batch 3 to 100 people, and of 2,300 subscribers only 1,000 were sent the issue while the one stamp request was refused as too long. The harness was a throwaway and is not in the repo.
- `tsc --noEmit` clean; eslint clean on the changed source file; `next build` succeeds.
- Not verified: any of this against the real Resend API or the real database. The fake follows Resend's documentation for idempotency keys. Whether Resend also remembers a key for a request it rejected is not documented and was not tested.
- Not covered, both measured in the harness: a recipient of the affected batch unsubscribes before the retry (the retry cuts a different batch and the other 99 get a second copy), and the affected batch is the last, part-filled one while someone subscribes before the retry (that batch gets a second copy). Also a retry more than 24 hours later, after Resend has dropped the key.
- Still open: an issue that ends `failed` has no resume path (unchanged).
