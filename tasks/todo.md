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
