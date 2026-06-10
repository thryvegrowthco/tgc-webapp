# Key Workflows — Thryve Growth Co.

End-to-end traces of every major data flow in the app. Useful for debugging, onboarding, and understanding the impact of code changes.

---

## 1. Booking Flow (One-Time Payment)

**Services:** Coaching sessions, interview prep sessions, resume review, HR consulting, culture consulting

```
Client visits /book
        │
        ▼
BookingFlow component (src/components/booking/BookingFlow.tsx)
  └── Client selects service type from dropdown
        │
        ├── If service is in BOOKABLE_SERVICES (coaching + interview prep)
        │       │
        │       ▼
        │   BookingCalendar.tsx
        │     Fetches: GET /api/booking/slots?month=YYYY-MM
        │     Response: array of dates that have ≥1 open slot
        │     Client picks a date
        │       │
        │       ▼
        │   TimeSlotPicker.tsx
        │     Fetches: GET /api/booking/slots?date=YYYY-MM-DD
        │     Response: array of { id, start_time, end_time, service_type }
        │     Client picks a time slot
        │
        └── If NOT bookable (resume, HR, etc.) → skip calendar
        │
        ▼
BookingForm.tsx
  Client fills in: name, email, phone, session notes
  Submits form
        │
        ▼
Server action: createBookingCheckoutSession (src/app/actions/booking.ts)
  1. Re-validates slot is still available (is_booked = false)
  2. Creates Stripe Checkout session (mode: 'payment')
     - Line item: price from SERVICES[serviceKey]
     - Metadata: { slotId, serviceType, clientName, clientEmail, userId, clientNotes }
     - Success URL: /book/success?session_id={CHECKOUT_SESSION_ID}
     - Cancel URL: /book
  3. Redirects to Stripe Checkout URL
        │
        ▼
Client pays on Stripe hosted checkout page
        │
        ▼
Stripe sends POST checkout.session.completed to /api/webhooks/stripe
        │
        ▼
handleCheckoutCompleted (src/app/api/webhooks/stripe/route.ts)
  1. Verifies Stripe signature
  2. Reads metadata from session
  3. Fetches slot date/time for email
  4. Inserts bookings row (status: 'confirmed', workflow_status: 'intake_needed')
  5. Updates availability_slots.is_booked = true
  6. Inserts payments row
  7. Creates Google Calendar event + Meet link (best-effort; sets meet_link_pending on failure)
  8. Pulls payment-method summary from Stripe PaymentIntent (card brand/last4 + receipt_url)
  9. Looks up the client's latest signed_service_agreements row (welcome email contract link)
 10. createAdminNotification({ type: 'new_booking', ... }) — surfaces in the bell
 11. Inserts admin_tasks row "Review intake when submitted" (idempotent via unique partial index)
 12. Promise.allSettled([
       sendTemplated("receipt", { ..., card_brand, card_last4, stripe_receipt_url, support_email }),
       sendTemplated("welcome", { ..., signed_agreement_url }),
       sendAdminBookingAlert(Rachel's email),
       syncBookingToGHL(GHL contact upsert)
     ]) ← failures don't block the 200 response
        │
        ▼
Client redirected to /book/success?session_id=...
  BookingSuccessClient reads session ID, fetches confirmation details, displays them
```

---

## 1c. Session Packages & Client Self-Service (Phase 1)

**Package credits.** Buying `coaching_package`/`interview_package` (`isPackageService`, `PACKAGE_SESSIONS` in `src/lib/stripe/products.ts`) creates the first session at checkout AND a `session_packages` row (`sessions_used = 1`) in the Stripe webhook (`handleCheckoutCompleted`). The client redeems the rest at **`/dashboard/packages`** → `PackageRedeemClient` (reuses `BookingCalendar`/`TimeSlotPicker` + `GET /api/booking/slots`) → `redeemPackageCredit` (`src/app/actions/packages.ts`): atomically claims the slot (`is_booked` guard), creates the session via **`createSessionBooking`** (no charge, `payment_status='paid'` covered by the package), decrements `sessions_used` (optimistic guard), and marks the package `exhausted` when full. Rachel sees usage on the client detail page.

**Shared core.** `createSessionBooking` (`src/lib/booking/finalize.ts`) is the no-charge session-creation core (insert + calendar + `session_confirmed` + admin notify) shared by `finalizeSession` (invitations) and `redeemPackageCredit` (packages).

**Client self-reschedule / cancel.** On `/dashboard/sessions/[bookingId]`, `ClientSessionActions` (shown only when the session is **>24h out**) calls `clientRescheduleSession` / `clientCancelSession` (`src/app/actions/sessions.ts`) — ownership-gated wrappers around the same `performReschedule`/`performCancel` cores the admin actions use. Both notify Rachel (`notifyAdmin`); cancel returns a package credit (`returnPackageCredit`). Within 24h the UI says "reply to Rachel."

---

## 1b. Booking Invitation → Session Flow

**Admin-initiated** (the inverse of the client-driven `/book` flow above). Rachel
hand-picks date/time options for a specific client, emails a public token link,
the client picks one, and a session is created. **Both the payment-OFF and
payment-ON branches converge on `finalizeSession()`** so calendar/emails/
notifications/audit are identical.

Key files: `src/app/actions/booking-invitations.ts`, `src/lib/booking/finalize.ts`,
`src/app/(booking)/book-session/[token]/`, `src/components/admin/BookingInvitationForm.tsx`.

```
Rachel: /admin/invitations/new  (or "Create booking invitation" on a client page)
  BookingInvitationForm → createBookingInvitation(payload)
    - validates; each option's session_at = localCentralToUtcIso(date, time)
    - inserts booking_invitations + booking_invitation_options (status 'open')
    - sendNow → sendBookingInvitation(): sendTemplated('booking_invitation'),
      status='sent', sent_at stamped
        │
        ▼
Client receives "Choose a Time for Your Thryve Session" email → /book-session/[token]
  Public, unauthenticated; service client looks up the invitation by token.
  States: valid (slot selector) | expired | already-accepted | cancelled | not-found
        │
   client picks one option
        ├─ payment OFF ── acceptBookingInvitation({token, optionId})
        │     reserveOption (open→reserved, atomic) → finalizeSession(source='invitation_free')
        │
        └─ payment ON ─── createInvitationCheckoutSession({token, optionId})
              reserveOption → Stripe Checkout (metadata.flow='invitation', invitationId, optionId)
              → webhook checkout.session.completed → handleInvitationCheckoutCompleted
              → finalizeSession(source='invitation_paid', paymentStatus='paid')
        │
        ▼
finalizeSession() [SHARED]:
  1. Idempotency (stripe_session_id / invitation.booking_id)
  2. Resolve client_id by email (links to portal if an account exists)
  3. Overlap guard against existing bookings[session_at, +duration)
  4. INSERT bookings (workflow_status='session_scheduled', duration/location/payment)
  5. INSERT payments (only when paid)
  6. createCalendarEvent (Meet only when location=google_meet; else event location)
     → meet_link / calendar_event_id, or meet_link_pending=true; automation_log
  7. Stamp invitation accepted + option 'consumed' + remaining options 'withdrawn'
  8. createAdminNotification('session_booked_via_invite') + bell
  9. sendTemplated('session_confirmed' → client, 'new_session_booked' → Rachel)
        │
        ▼
Client → /book-session/[token]/confirmed.   Session appears in /admin/sessions and,
if the email matches an account, /dashboard/sessions/[bookingId].
```

**Double-booking prevention (defense in depth):** (1) the atomic option reserve
(`open→reserved`) is the per-option guarantee — the loser gets "That time was
just taken"; (2) a partial **UNIQUE index on `bookings(booking_invitation_id)`**
(migration 0025) means one invitation can only ever produce one session even
under a concurrent-accept or double-webhook race — `finalizeSession` catches the
unique violation (`23505`) and returns the existing booking idempotently; (3) the
`finalizeSession` overlap query guards across different invitations and `/book`
slots. Abandoned paid checkouts return to `cancel_url` → `releaseReservedOptions`
(`reserved→open`); the Stripe Checkout session is also created with
`expires_at = now+2h` so the payable window can't outlive the hold; a TTL sweep
in the `session-reminders` cron releases holds older than 2h on un-accepted
invitations (`booking_invitation_options.reserved_at`).

**Paid finalize conflict (charged-but-no-session):** if a payment-ON invitation
clears Stripe but `finalizeSession` then rejects (slot taken in the meantime),
`handleInvitationCheckoutCompleted` **refunds the PaymentIntent, releases the
option, and alerts Rachel** (`notifyAdmin`) rather than silently dropping a paid
booking.

**Session management (admin, Phase 2):** `src/app/actions/sessions.ts` —
`rescheduleSession(bookingId, dateCentral, timeCentral)` recomputes `session_at`,
PATCHes the Google Calendar event via `updateCalendarEvent` (or recreates it),
resets the reminder flags so they re-fire, and re-sends `session_confirmed`;
`sendSessionReminderNow` sends the `session_reminder_1h` template on demand;
`cancelSession` sets `cancelled` and removes the calendar event via
`deleteCalendarEvent`. Rich editing (status incl. `no_show`, `payment_status`,
`session_summary`, `next_steps`, `follow_up_needed`) flows through
`updateSession` from the `SessionRecordEditor` on the client detail page. The
admin overview shows an `UpcomingSessionsWidget` (today + next 7 days) with
inline reminder/complete actions.

**Reminders:** the hourly `session-reminders` cron now fires three windows —
T-24h client (`session_reminder_24h`), **T-1h client (`session_reminder_1h`,
gated by `bookings.reminder_1h_sent_at`)**, and T-2h Rachel prep summary.

---

## 1d. Proposal → Accept → Pay Flow (Phase 2)

**Admin-initiated, quote-based consulting revenue.** HR / recruitment / culture
work is scoped per engagement, so Rachel builds a proposal (scope + terms via the
rich-text editor + a price), emails a public token link, and the client reviews
it on a public page, accepts (typed-signature, immutable snapshot — mirrors
`signed_service_agreements`), and **pays on accept** via Stripe Checkout. A `$0`
proposal is sign-only with no checkout (covers fixed-scope no-charge agreements).

Key files: `src/app/actions/proposals.ts`, `src/app/api/webhooks/stripe/route.ts`
(`handleProposalCheckoutCompleted`), `src/app/(proposals)/proposal/[token]/`,
`src/components/admin/ProposalForm.tsx`, `src/components/proposals/ProposalContent.tsx`,
`src/components/proposals/ProposalAcceptClient.tsx`.

```
Rachel: /admin/proposals/new  (or "Create proposal" on a lead/client page,
        prefilled via ?leadId= / ?clientId=)
  ProposalForm → createProposal(input, sendNow?)   [requireAdmin]
    - validates (valid email, title, amount ≥ 0; paid must be ≥ $0.50)
    - inserts proposals row (status 'draft'); content = Tiptap JSON
    - Save draft → stays 'draft';  Send → sendProposal()
  sendProposal(id)  [requireAdmin]
    - sendTemplated('proposal_sent') with proposal_url = /proposal/{token}
    - status='sent', sent_at stamped (never downgrades an accepted/paid row)
        │
        ▼
Client receives "Your Proposal from Thryve Growth Co." email → /proposal/[token]
  Public, unauthenticated; service client looks up the proposal by token.
  loadLiveProposal guards: not-found | paid | cancelled | declined | expired
  ProposalContent renders scope/terms (Tiptap extensions match RichTextEditor,
  incl. Image); ProposalAcceptClient shows the signature input + accept/decline.
        │
   client types name + accepts ── acceptProposal({token, signedName})  [token bearer; no admin gate]
        - records acceptance ONCE (idempotent on retry): status='accepted',
          accepted_at/name/ip, accepted_snapshot = copy of content
        - notifyAdmin('proposal_accepted') → Rachel (bell + email)
        ├─ amount_cents == 0 ── redirect → /proposal/[token]/accepted (done; sign-only)
        └─ amount_cents  > 0 ── Stripe Checkout (ad-hoc price_data,
              metadata.flow='proposal', proposalId)
              success_url → /proposal/[token]/accepted ; cancel_url → ?cancelled=1
              → webhook checkout.session.completed → handleProposalCheckoutCompleted
                  - idempotent (proposals.status check + UNIQUE stripe_session_id)
                  - status='paid', paid_at + stripe ids stamped
                  - INSERT payments (proposal_id set; service_type = service_type||title)
                  - sendTemplated('receipt') → client
                  - notifyAdmin('proposal_paid') → Rachel
        │
   client declines ──────────── declineProposal({token})  [token bearer]
        - status='declined', declined_at; notifyAdmin → Rachel (follow-up)
        │
        ▼
Client → /proposal/[token]/accepted (confirmation).
```

**Locked once acted on:** `updateProposal` refuses edits when status is
`accepted`/`paid`/`declined` (an accepted proposal is an immutable record).
`cancelProposal` refuses to cancel a `paid` proposal (refund in Stripe instead).
A re-run of `acceptProposal` after an abandoned checkout preserves the original
signature snapshot and just re-opens checkout.

**Lead capture:** a free-consultation request now also writes a `leads` row
(see **6b**), so Rachel can convert it straight into a proposal from
`/admin/leads/[id]` (the proposal carries `lead_id`).

---

## 2. Job Alerts Subscription Flow

**Service:** Job Alerts & Watchlists ($50/month)

```
Client visits /book or /services/job-alerts
        │
        ▼
Selects "Job Alerts & Watchlists" service (not in BOOKABLE_SERVICES → no slot needed)
        │
        ▼
BookingForm → createBookingCheckoutSession (mode: 'subscription')
  - Creates Stripe Checkout session with mode: 'subscription'
  - Uses STRIPE_PRICE_JOB_ALERTS (recurring price)
        │
        ▼
Client pays → Stripe sends checkout.session.completed
        │
        ▼
handleSubscriptionCheckoutCompleted (src/app/api/webhooks/stripe/route.ts)
  1. Reads userId from metadata
  2. Upserts watchlist_profiles:
     - client_id = userId
     - subscription_status = 'active'
     - stripe_subscription_id = session.subscription
  3. Inserts payments row (with stripe_subscription_id)
        │
        ▼
Client visits /dashboard/watchlist
  - watchlist_profiles row exists → shows empty list + "Edit preferences" link
  - No profile → shows setup prompt with "Get Started" button
        │
        ▼
Client visits /dashboard/watchlist/setup
  Fills WatchlistSetupForm: roles, industries, locations, salary, remote pref, notes
  Submits → saveWatchlistProfile server action
  Updates watchlist_profiles with preference fields → redirects to /dashboard/watchlist
        │
        ▼
Rachel visits /admin/watchlists → clicks "Manage" for this client
  Option A: Fetch from JSearch
    → fetchJSearchJobsForClient server action
    → reads target_roles + locations from watchlist_profiles
    → calls searchJobs() → normalizeJob()
    → deduplicates by external_id
    → inserts new job_listings rows
    → upserts client_job_matches (status: 'new', rachel_recommended: false)

  Option B: Add Manually
    → addManualJob server action → inserts job_listings
    → assignJobToClient → upserts client_job_matches (status: 'new', rachel_recommended: true)
        │
        ▼
Client sees jobs on /dashboard/watchlist
  Uses MatchStatusSelect to update their status on each match
  → updateMatchStatus server action → updates client_job_matches.status
        │
        ▼
Every Monday 9AM UTC: GET /api/cron/job-alerts (cron-job.org)
  1. Verifies Bearer token (CRON_SECRET)
  2. Fetches all watchlist_profiles where subscription_status = 'active'
  3. For each subscriber:
     a. Fetches client_job_matches created in past 7 days with status = 'new'
     b. If 0 new matches → skip (no email sent)
     c. Fetches job_listings for those match IDs
     d. Builds plain-text email digest
     e. Sends via Resend
  4. Returns { sent, errors }
```

---

## 2b. Subscription Cancellation Flow

```
Client cancels subscription in Stripe billing portal or Stripe dashboard
        │
        ▼
Stripe fires customer.subscription.deleted to /api/webhooks/stripe
        │
        ▼
handleSubscriptionDeleted (src/app/api/webhooks/stripe/route.ts)
  1. Reads subscription.id from event.data.object
  2. Finds watchlist_profiles row WHERE stripe_subscription_id = subscription.id
  3. Updates subscription_status = 'cancelled', updated_at = NOW()
        │
        ▼
Next Monday cron at 9AM UTC:
  Fetches watchlist_profiles WHERE subscription_status = 'active'
  → cancelled client is excluded → no email sent
```

**Subscription status transitions via customer.subscription.updated:**

```
Stripe status          → local subscription_status
─────────────────────────────────────────────────
active / trialing      → 'active'
past_due / paused /
  unpaid               → 'inactive'
canceled               → 'cancelled'
incomplete /
  incomplete_expired   → (no update — skipped)
```

`handleSubscriptionUpdated` fires on every Stripe subscription lifecycle change and keeps `watchlist_profiles.subscription_status` in sync.

---

## 2c. Watchlist Enhancements (questionnaire, curation, tracker, notifications)

**Activation stays pay-first** (Section 2). These enhancements layer on top.

**Full questionnaire.** `WatchlistSetupForm` (`src/components/dashboard/WatchlistSetupForm.tsx`) captures the complete criteria set — roles, industries, locations, salary, remote pref, employment types, keywords, skills, certifications, education, employers of interest/exclude, job-board preferences, work environment, travel, work authorization, must-haves, nice-to-haves, notes. `saveWatchlistProfile` persists them and (on edit, not first setup) sends a `watchlist_updated` client notification + email. The same form, passed `adminClientId`, edits a client's criteria from `/admin/watchlists/[clientId]` via `updateWatchlistProfileAsAdmin`.

**Scoring** (`src/lib/matching/score.ts`): base factors sum to 100 (title 30, keywords 12, skills 12, location 18, salary 10, experience 8, certs 5, industry 5). Preferred employers add a bonus; nice-to-haves add a small bonus. **Hard gates**: an excluded-employer match or any unmet must-have forces score 0 / excluded. Threshold for inclusion stays 60. Verified by `scripts/verify-scoring.ts`.

**Manual curation.** In `WatchlistManager`, Rachel adds a job with `match_reason` (why it matches), `priority_level`, `recommended_action`, and private `rachel_notes`. `assignJobToClient(clientId, jobId, curation)` writes these onto `client_job_matches`, tags it "Curated by Rachel", and — only when a new match row is created — sends a `curated_job_match` notification + email. `fetchJSearchJobsForClient` and `runAutoMatchForClient` send a `new_job_match` notification for the count of newly-assigned matches.

**Client dashboard.** `/dashboard/watchlist` renders `JobCard`s with all fields, the curated badge + why/next-step, a Favorite star (`toggleFavorite`), an inline note (`updateMatchNotes`), the status dropdown, and an Apply link. Tabs: All Matches / Saved & Favorites (`?view=saved`). Marking a card `applied` stamps `application_date`.

**Application tracker.** `/dashboard/applications` groups matches across the 9 spec stages. Each card's "Details & timeline" panel (`ApplicationDetail`) edits interview date, salary offered, next steps, notes, and attaches a resume + cover letter from the client's `documents` — saved via `updateApplicationDetails`.

**Access gating.** `getWatchlistAccess()` (`src/lib/watchlist/access.tsx`) shows a reactivate notice on the job-alerts pages when `subscription_status != 'active'`. Booking/coaching clients are unaffected.

**Client bell.** The dashboard layout fetches `client_notifications` and renders `NotificationBell`; `markClientNotificationRead` / `markAllClientNotificationsRead` clear them.

---

## 2d. Automated Feed, Reminders & Reporting (Phase 2)

**Pluggable sources.** Each board implements `JobSource` (`src/lib/job-api/types.ts`). Registered in `src/lib/job-api/sources.ts` (`ALL_SOURCES`); `getEnabledSources()` returns those toggled on in the `job_sources` table. Shipped: `jsearch` (on) and `usajobs` (off until keys set). Rachel toggles them in `/admin/integrations → Automated Job Sources`.

```
Mon 8AM UTC: GET /api/cron/job-feed
        │
        ▼
getEnabledSources() → for each active watchlist_profiles row:
   ingestForClient(clientId, profile, sources)   [src/lib/job-api/ingest.ts]
     1. each source.search({query from target_roles, location, isRemote})
     2. dedup by external_id (batch + vs existing job_listings)
     3. insert new job_listings
     4. scoreJobAgainstProfile → upsert client_job_matches (score ≥ 60), ignoreDuplicates
     5. notify client of newly-created matches (new_job_match in-app + email)
        │
        ▼
writes one job_feed_run row to automation_log {sources, clients, fetched, inserted, matched}
```

This is the engine that *creates* matches; the older `/api/cron/job-alerts` only *emails a digest* of matches already created.

**Application reminders.** `GET /api/cron/application-reminders` (daily) finds matches whose `application_date` is exactly 7, 14, or 30 days ago and `status='applied'`, then sends an `application_reminder` (in-app + email). Idempotent per `(matchId, milestone)` via an `automation_log` pre-check.

**Reporting.** `computeJobAlertsReport()` (`src/lib/reporting/job-alerts.ts`) aggregates client counts, placement rate (`accepted ÷ applications`), application/interview/offer/accepted totals, top industries (by watchlist preference), and "most successful searches" (target roles ranked by applications). Rendered on `/admin/analytics`; the same data exports per-client via `GET /api/admin/job-alerts/export` (CSV).

**Message attachments.** `uploadMessageAttachment` stores a file in the private `documents` bucket at `messages/{clientId}/...`; `sendMessage` records `client_messages.attachment_path`; `MessageThread` renders a download link served by `/api/messages/attachment` (admins any; clients only their own thread folder).

---

## 3. Blog Publishing Flow

```
Rachel visits /admin/content/new
        │
        ▼
BlogPostForm component (src/components/admin/BlogPostForm.tsx)
  - Title → auto-generates slug (stops auto-generating if manually edited)
  - Excerpt
  - Optional: featured image upload
        │ (on image upload)
        ▼
  uploadFeaturedImage server action (src/app/actions/blog.ts)
    → uses service client
    → uploads to Supabase Storage: blog/{timestamp}-{filename}
    → calls getPublicUrl() → returns public URL
    → stored in form state (not saved to DB until post is saved)
        │
        ▼
  RichTextEditor (src/components/admin/RichTextEditor.tsx)
    Tiptap editor: StarterKit (h2/h3/h4, no codeBlock) + Link + Image + Placeholder + CharacterCount
    onChange → updates form state with editor.getJSON()
        │
        ▼
  "Publish" button clicked
        │
        ▼
createBlogPost server action (new post) or updateBlogPost (edit)
  createBlogPost:
    1. requireAdmin() check
    2. Unique slug check (SELECT from blog_posts WHERE slug = ...)
    3. INSERT blog_posts with published = true, published_at = NOW()
    4. redirect('/admin/content/{newId}')

  updateBlogPost:
    1. requireAdmin() check
    2. Unique slug check excluding self (WHERE slug = ... AND id != postId)
    3. UPDATE blog_posts
       - published_at: only set if not already set (preserves original publish date)
    4. router.refresh() on client
        │
        ▼
Public: client visits /blog/{slug}
        │
        ▼
getPost(slug) fetches from blog_posts WHERE slug = ? AND published = true
        │
        ▼
generateHTML(post.content as JSONContent, renderExtensions)
  Extensions must match between editor (RichTextEditor.tsx) and renderer (blog/[slug]/page.tsx):
  - StarterKit.configure({ heading: { levels: [2,3,4] }, codeBlock: false })
  - TiptapLink.configure({ HTMLAttributes: { class: "..." } })
  - TiptapImage.configure({ HTMLAttributes: { class: "..." } })
        │
        ▼
Page renders HTML via dangerouslySetInnerHTML + Tailwind prose classes
```

---

## 4. Document Upload and Download Flow

**Upload (admin):**

```
Rachel on /admin/clients/{id}
  Clicks "Upload Document"
        │
        ▼
DocumentUploadForm (src/components/admin/DocumentUploadForm.tsx)
  Fills: file, category, description → submits
        │
        ▼
uploadDocument server action (src/app/actions/documents.ts)
  1. requireAdmin() check
  2. Read file buffer from FormData
  3. Sanitize filename (remove special chars)
  4. Upload to Supabase Storage via service client:
     Path: {clientId}/{timestamp}-{safeFilename}
  5. INSERT documents row (client_id, uploaded_by, filename, storage_path, ...)
  6. On DB error → delete Storage object (cleanup)
  7. router.refresh() on client
```

**Download (client or admin):**

```
Client on /dashboard/documents
  Clicks "Download" link → href="/api/documents/download?path={storage_path}&name={filename}"
        │
        ▼
GET /api/documents/download (src/app/api/documents/download/route.ts)
  1. supabase.auth.getUser() → must be authenticated
  2. If NOT admin:
     - Query documents table: SELECT WHERE storage_path = ? AND client_id = user.id
     - If no match → 403 Forbidden
  3. If admin → skip ownership check
  4. createSignedUrl(storagePath, 3600 seconds, { download: filename })
  5. 302 redirect to signed URL
```

---

## 5. Authentication Flows

**Signup:**

```
Client visits /signup
  Fills name, email, password → submits
        │
        ▼
signUp server action (src/app/actions/auth.ts)
  supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name },
      emailRedirectTo: "{APP_URL}/auth/callback"
    }
  })
        │
        ▼
Supabase fires Send Email hook → POST /api/auth/send-email
  (src/app/api/auth/send-email/route.ts)
  1. Verifies HMAC-SHA256 signature using SUPABASE_HOOK_SECRET
  2. email_action_type = "signup"
  3. Constructs: {APP_URL}/auth/confirm?token_hash=...&type=signup&next=/dashboard
  4. sendSignupConfirmation(email, name, confirmUrl) via Resend
        │
        ▼
Client receives branded confirmation email from hello@go.thryvegrowth.co
Client clicks link → /auth/confirm (src/app/auth/confirm/route.ts)
  supabase.auth.verifyOtp({ token_hash, type: 'signup' })
  Sets session cookie
  Redirects to /dashboard
        │
        ▼
handle_new_user() Postgres trigger fires on auth.users INSERT
  Creates profiles row: { id, email, full_name, role: 'client' }
  (role = 'admin' if email matches hardcoded ADMIN_EMAIL in migration 0003)
```

**Login:**

```
Client visits /login → fills email + password
        │
        ▼
logIn server action
  supabase.auth.signInWithPassword({ email, password })
  redirect('/dashboard')
```

**Password reset:**

```
Client visits /reset-password → enters email
        │
        ▼
requestPasswordReset server action
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "{APP_URL}/auth/callback?next=/dashboard/profile"
  })
        │
        ▼
Supabase fires Send Email hook → POST /api/auth/send-email
  email_action_type = "recovery"
  Constructs: {APP_URL}/auth/confirm?token_hash=...&type=recovery&next=/reset-password
  sendPasswordReset(email, name, resetUrl) via Resend
        │
        ▼
Client clicks email link → /auth/confirm
  supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
  Redirects to /reset-password
        │
        ▼
Client on /reset-password → enters new password
        │
        ▼
updatePassword server action
  supabase.auth.updateUser({ password: newPassword })
```

---

## 6. Contact Form Flow

```
Visitor on /contact → fills firstName, lastName, email, subject, message → submits
        │
        ▼
ContactForm (src/components/shared/ContactForm.tsx)
  POST /api/contact with JSON payload
        │
        ▼
/api/contact route handler (src/app/api/contact/route.ts)
  1. Validate: all 5 fields non-empty strings; email matches regex;
     field lengths within limits (message ≤ 5000 chars, others ≤ 200)
  2. Call sendContactFormSubmission (src/lib/email/resend.ts)
       - from: hello@go.thryvegrowth.co (must be verified in Resend)
       - to:   hello@thryvegrowth.co
       - replyTo: submitter's email → Rachel can reply directly
       - HTML body with escaped fields, message line breaks preserved
  3. On Resend error → 500 + console.error with details
  4. On success → { ok: true } → ContactForm shows "Message received!"
```

**Graceful degradation:** None. If Resend is misconfigured (e.g., `go.thryvegrowth.co` is not a verified sending domain in Resend) the request returns 500 and the user sees a generic error. Check server logs for the underlying Resend error message.

---

## 6b. Free Consultation Request Flow

```
Visitor on /consultation → fills firstName, lastName, email, phone?, timing?, message → submits
        │
        ▼
ConsultationForm (src/components/marketing/ConsultationForm.tsx)
  POST /api/consultation with JSON payload
        │
        ▼
/api/consultation route handler (src/app/api/consultation/route.ts)
  1. Validate: firstName/lastName/email/message non-empty; email regex; field lengths
     (message ≤ 5000, others ≤ 200); timing in allowed set if provided
  2. Send admin alert via sendConsultationRequest (src/lib/email/resend.ts)
       - to: hello@thryvegrowth.co, replyTo: submitter
       - Subject: "Free consultation request from {fullName}"
       - On Resend error → 500
  3. Best-effort: sendConsultationRequestAutoReply to the submitter
       (warm acknowledgement, 1–2 business day response promise)
  4. Best-effort: syncContactToGHL with tags ["thryve-lead", "consultation-requested"]
       - timing (when provided) written to consultation_timing custom field
  5. Best-effort: INSERT a leads row (service client) — source='consultation',
     status='new', timeline=timing, notes=message — so Rachel can track it and
     convert it into a proposal (see 1d). Failure does not fail the request.
  6. Return { ok: true } → ConsultationForm shows "Request received!"
```

**Why separate from /book:** `/book` is the paid Stripe session selector. `/consultation` is the
free-consult entry point — all primary marketing CTAs ("Book a Free 30-Minute Consultation Call"
in Header, Home final CTA, AboutCTA, all SectionCTA usages, FAQ + contact inline links, HomeHero
"Start Your Growth", testimonials "Work with Rachel") route here. Repeat customers / users who
want a paid session directly can still reach `/book` from the consultation page sidebar, the
dashboard, or the `/services/interview-prep` page.

**Best-effort behavior:** Auto-reply, GHL sync, and the `leads` insert are each wrapped in their
own try/catch — if any fails, the request still succeeds for the submitter because Rachel already
has the admin alert. This matches the booking-flow philosophy of not blocking on non-critical
side effects.

---

## 7. Newsletter Publishing Flow

### 7a. Subscribe + welcome (subscriber-initiated)

```
Visitor submits NewsletterForm (footer, blog, or /newsletter landing page)
        │
        ▼
POST /api/newsletter with { email, firstName?, source, interests[] }
        │
        ▼
/api/newsletter route handler (src/app/api/newsletter/route.ts)
  1. Normalize email (trim, lowercase, regex)
  2. Sanitize interests against the 7-slug enum in src/lib/newsletter/interests.ts
  3. Upsert into newsletter_subscribers
       - New row: insert with interests + source
       - Existing row: union(interests), clear unsubscribed_at
  4. Fire-and-forget syncNewsletterSubscriber to GoHighLevel
       - Tags: ["thryve-newsletter"]
  5. If welcome_sent_at IS NULL:
       - Send welcome email via sendWelcomeEmail (src/lib/email/newsletter-welcome.ts)
       - Stamp welcome_sent_at to make this idempotent
  6. Return { ok: true, alreadySubscribed: bool }
```

The welcome email is warm and personal, lists the 7 content types, sets the weekly cadence expectation, and includes a tokenized unsubscribe link.

### 7b. Authoring an issue (Rachel)

```
Rachel → /admin/newsletter/issues/new
   New issue pre-fills from the default template (seeded in migration 0009).
   Editor: NewsletterEditor (src/components/admin/NewsletterEditor.tsx) using
   newsletterEditorExtensions from src/lib/newsletter/extensions.ts.

Rachel fills in: internal title, subject, preheader, body, target_interests,
optionally a featured blog post.

Action buttons (server actions in src/app/actions/newsletter.ts):
   - Save draft               → updateIssue, status stays 'draft'
   - Send test                → POST /api/admin/newsletter/test-send
                                renders + sends one copy to any email
   - Submit for approval      → status → 'pending_approval'
   - Approve & schedule       → approveAndSchedule(id, datetime)
                                requires +5 minutes in the future
                                status → 'scheduled', stamps approved_by/approved_at
   - Send now                 → approveAndSendNow → sendIssue(id)
   - Duplicate                → copies content into a new draft
```

The preview iframe at /admin/newsletter/issues/[id]/preview reads from
`GET /api/admin/newsletter/preview/[id]` which renders the issue HTML using
`renderIssueHTML` from src/lib/email/newsletter-render.ts.

### 7c. Scheduled send (cron)

```
cron-job.org hits /api/cron/newsletter-send hourly ("0 * * * *")
        │
        ▼
Route handler authenticates via CRON_SECRET
        │
        ▼
SELECT FROM newsletter_issues
  WHERE status='scheduled' AND scheduled_for <= NOW()
        │
        ▼
For each due issue, call sendIssue(id) (src/lib/email/newsletter-send.ts):
  1. Lock: UPDATE status='sending' (atomic; safe under cron retries)
  2. Render baseHtml + baseText once via renderIssueHTML / renderIssueText
  3. Load matching recipients (interest-filtered, exclude unsubscribed)
  4. Chunk to 100/batch. For each batch:
       - Build per-recipient payload with first_name + tokenized
         unsubscribe URL substituted into the rendered HTML
       - Add List-Unsubscribe + List-Unsubscribe-Post headers (RFC 8058)
       - resend.batch.send(payload)
       - Insert newsletter_sends rows with resend_message_id
       - Sleep 1.1s between batches (stays under Resend's 10 req/s)
  5. UPDATE status='sent', sent_at, sent_count, failed_count
  6. UPDATE last_sent_at on each delivered subscriber
```

Hourly cron precision means an issue scheduled for 9:15 AM sends at the next
top-of-hour. Acceptable for a weekly newsletter; documented in `rachel-admin-guide.md`.

### 7d. Engagement tracking (Resend webhook)

```
Resend delivers an email → fires email.delivered / opened / clicked / bounced / complained
        │
        ▼
Resend POSTs to /api/webhooks/resend (Svix-signed)
        │
        ▼
Webhook handler (src/app/api/webhooks/resend/route.ts):
  1. Verify Svix signature using RESEND_WEBHOOK_SECRET (HMAC-SHA256)
  2. Map event type → ('delivered'|'opened'|'clicked'|'bounced'|'complained')
  3. Look up newsletter_sends WHERE resend_message_id = data.email_id
  4. Insert newsletter_events row keyed by resend_event_id (UNIQUE) for idempotency
  5. Side effects:
       - opened|clicked: UPDATE subscribers.last_engaged_at = event time
       - bounced|complained: UPDATE subscribers.unsubscribed_at = NOW()
```

### 7e. Re-engagement (cron)

`/api/cron/newsletter-reengage` runs weekly on Wednesday 9 AM Central (`0 14 * * 3`).
Finds subscribers where `last_sent_at < NOW() - 7 days` AND
(`last_engaged_at IS NULL OR last_engaged_at < NOW() - 60 days`), capped at
50 per run. Sends the canned "we miss you" email (`sendReengagementEmail`).

### 7f. Milestones (cron)

`/api/cron/newsletter-milestones` runs daily (`0 14 * * *`). Sends a thank-you
note on the 6-month and 1-year anniversary of each subscriber's signup.

### 7g. Unsubscribe + preferences

| URL | Purpose |
|---|---|
| `/newsletter/unsubscribe/[token]` | Pretty marketing page. Visiting auto-unsubscribes (idempotent). Offers feedback textarea + resubscribe link. |
| `POST /api/newsletter/unsubscribe/[token]` | Gmail one-click endpoint referenced in the `List-Unsubscribe` header. |
| `/newsletter/manage/[token]` | Edit interests, see current status, resubscribe. |
| `POST /api/newsletter/manage/[token]` | JSON endpoint backing the manage page. |

Tokens are 16-byte random hex stored in `newsletter_subscribers.unsubscribe_token`. No login required to use any of these.

---

## 8. Recurring Availability Flow

```
Rachel visits /admin/bookings → "My weekly schedule"
        │
        ▼
WeeklyScheduleEditor (src/components/admin/WeeklyScheduleEditor.tsx)
  Each row defines a weekly time block on a single day-of-week with optional
  service_type and slot duration. Rachel saves per row.
        │
        ▼
upsertPattern (src/app/actions/availability.ts)
  1. Admin check
  2. Validates HH:MM times + end > start
  3. INSERT or UPDATE availability_patterns
  4. Calls rebuildForward({ patternId, fromDate: today })
        │
        ▼
rebuildForward (src/lib/availability/generate.ts)
  1. DELETE availability_slots WHERE pattern_id = $id AND slot_date >= today
                                 AND is_booked = false
     (Booked slots are preserved — clients keep their existing sessions.)
  2. materializePatterns: walks today..today+8wks, computes which dates match
     each active pattern (skipping blackouts), splits each block by
     slot_duration_minutes, upserts on UNIQUE (slot_date, start_time).
        │
        ▼
revalidatePath("/admin/bookings") → page re-renders with new state.

Daily 11:00 UTC (~5am CT): GET /api/cron/extend-availability (cron-job.org)
  1. Verifies Bearer token (CRON_SECRET)
  2. materializePatterns(now=today, weeks=8)
  3. Logs to automation_log (event_key='availability_extended')
  4. Returns { ok, created, scanned, window_start, window_end }
```

### 8b. Blackout dates

```
Rachel adds a blackout (date range + optional reason)
        │
        ▼
addBlackout (src/app/actions/availability.ts)
  1. Admin check + range validation
  2. INSERT availability_blackouts
  3. DELETE availability_slots WHERE slot_date BETWEEN start AND end
                                  AND is_booked = false
                                  AND pattern_id IS NOT NULL
     (One-off slots from BulkSlotForm are left alone.)
  4. COUNT(*) of already-booked slots in the range → returned so the UI can
     warn Rachel which clients to reach out to
        │
        ▼
revalidatePath → BlackoutManager shows the new entry + toast confirms counts.
```

Removing a blackout calls `removeBlackout`, which deletes the row and runs
`rebuildForward(null, fromDate=blackoutStartOrToday)` to re-fill the
previously-suppressed days.

### 8c. Legacy bulk form

The original `BulkSlotForm` is still mounted under a `<details>` on
`/admin/bookings` ("Add one-off slots"). It calls `addBulkAvailabilitySlots`
to insert discrete `availability_slots` rows with `pattern_id = NULL`. Those
slots are unaffected by pattern/blackout logic and have to be deleted
manually via `SlotList`.



---

## 9. Intake Submission Flow

```
Client opens /dashboard/sessions/[bookingId]
        │
        ▼
IntakeForm component (built from src/lib/intake/schemas.ts[booking.service_key])
  Auto-saves on field blur via saveIntake({ submit: false })
        │
        ▼
Client clicks Submit
        │
        ▼
saveIntake (src/app/actions/intake.ts)
  1. Verifies booking ownership
  2. Validates responses against the service schema
  3. Upserts intake_responses (sets submitted_at)
  4. Transitions bookings.workflow_status → 'intake_complete'
  5. sendTemplated("intake_complete", ...) — client confirmation email
  6. sendAdminBookingAlert(..., { subject, uploadedFiles }) — Rachel's email lists files
  7. createAdminNotification({ type: 'intake_submitted', ... }) — bell
  8. createAdminNotification({ type: 'client_doc_upload', ... }) — one per uploaded file
  9. Inserts admin_tasks row "Prepare deliverable / session"
       (due_at = session_at − 12h if scheduled, else now + 3 days)
```

Uploaded files are detected by walking the `responses` JSONB for `{ path, filename }` shapes — the same parser shape used by `IntakeFormView` in the admin panel.

---

## 10. Admin Notifications

In-app alternative to email-only triage. One Postgres row per event in `admin_notifications`, surfaced two ways:

- **Bell** in the admin top bar — last 20 rows + unread count badge. Polls every 60s via `router.refresh()`.
- **Inbox** at `/admin/notifications` — latest 200, grouped Today / Yesterday / Earlier this week / Older.

| Trigger source | type | Key |
|---|---|---|
| Stripe webhook (one-time + subscription) | `new_booking` | createAdminNotification on booking insert |
| `saveIntake` on submit | `intake_submitted` | one per submission |
| `saveIntake` on submit (per file) | `client_doc_upload` | one per uploaded filename |
| `/api/cron/intake-overdue-alert` | `intake_overdue` | one per overdue booking; idempotent via `automation_log` event_key `intake_overdue_alert_sent` |
| `/api/cron/session-reminders` T-24h branch | `session_in_24h` | guarded by `bookings.session_reminder_sent_at` |

The bell mutates state via two server actions in `src/app/actions/notifications.ts`:
- `markNotificationRead(id)` — sets `read_at = NOW()`
- `markAllNotificationsRead()` — sets `read_at = NOW()` for all unread

Both revalidate the `/admin` layout so the badge and dropdown reflect new state on the next render.

---

## 11. Admin Tasks

Rachel's to-do list, modeled as a single `admin_tasks` table with optional FKs to a booking and a client.

**Auto-creation:**
- Stripe webhook → "Review intake when submitted" (due = `intake_due_at`). Idempotent via the unique partial index `admin_tasks(related_booking_id) WHERE title = 'Review intake when submitted'`.
- `saveIntake` on submit → "Prepare deliverable / session" (due = `session_at − 12h` or `now + 3 days`).

**Manual creation:** the `AddTaskForm` client component renders on `/admin`, `/admin/tasks`, and `/admin/clients/[id]` (pre-fills `relatedClientId`).

**Filters on `/admin/tasks`** (driven by `searchParams.filter`):
- `upcoming` (default) — `completed_at IS NULL`, ordered by `due_at NULLS LAST`
- `overdue` — `completed_at IS NULL AND due_at < now()`
- `completed` — `completed_at IS NOT NULL`, ordered by `completed_at DESC`

**Server actions** (`src/app/actions/tasks.ts`, all gated on shared `requireAdmin()`):
`createTask`, `updateTask`, `completeTask`, `uncompleteTask`, `deleteTask`. Each revalidates `/admin`, `/admin/tasks`, and the related client page when applicable.

---

## 12. Deliverable Upload Notification

```
Admin uploads a document on /admin/clients/[id]
DocumentUploadForm.tsx → uploadDocument server action
        │
        ▼
uploadDocument (src/app/actions/documents.ts)
  1. Validates admin role
  2. Uploads file to Storage bucket 'documents'
  3. Inserts documents row with the chosen category
  4. If category in ('deliverable', 'resume_rewrite', 'hr_doc'):
       a. Pre-checks automation_log for event_key 'deliverable_ready_sent:{documentId}'
       b. If not present: sendTemplated("deliverable_ready", { client_name, deliverable_type, deliverable_url })
       c. sendTemplated logs the row → next retry is a no-op
```

The pre-check is necessary because `sendTemplated`'s built-in idempotency is keyed on `(event_key, booking_id)` with a partial UNIQUE that requires `booking_id IS NOT NULL`. Deliverable uploads aren't tied to a booking, so the dedupe relies entirely on the document-scoped event_key.

---

## 13. Admin Notification Coverage

Every inbound lead/subscriber/client interaction notifies Rachel on **two channels at once** — a real-time email to `ADMIN_EMAIL` and an in-app bell row — via `notifyAdmin()` (`src/lib/notifications/admin.ts`), which wraps `sendAdminAlert` (email, `src/lib/email/resend.ts`) + `createAdminNotification` (bell). All calls are best-effort and never block the user's action.

```
Inbound event                          → notifyAdmin type        → entry point
─────────────────────────────────────────────────────────────────────────────
Newsletter subscribe / resubscribe     → new_subscriber          → api/newsletter/route.ts
Newsletter unsubscribe                 → subscriber_unsubscribed → api/newsletter/unsubscribe/[token]
Newsletter preference change           → subscriber_updated      → api/newsletter/manage/[token]
Job Alerts subscription purchase       → new_subscription        → webhooks/stripe (sub checkout)
Subscription cancel/pause/past_due/    → subscription_issue      → webhooks/stripe (deleted/updated/
  payment failed                                                     invoice.payment_failed)
Watchlist preferences edited           → watchlist_updated       → actions/watchlist.ts saveWatchlistProfile
Application status change (≠ new)       → application_status      → actions/watchlist.ts updateMatchStatus
Client sends a message                 → client_message          → actions/messages.ts sendMessage
Client books via invitation            → session_booked_via_invite → lib/booking/finalize.ts finalizeSession
```

Pre-existing admin alerts unchanged: contact form, consultation, job-watchlist lead, one-time booking + intake (`sendAdminBookingAlert`), newsletter feedback. Notification types were added to the `admin_notifications` CHECK in `0021_admin_notification_types.sql` and `0023_booking_invitations.sql` (`session_booked_via_invite`). The invitation flow's bell row is created directly via `createAdminNotification`; its admin **email** is the editable `new_session_booked` template (not `sendAdminAlert`).

**Toggles:** every non-critical notification above (admin + client/lead, email + bell) can be switched off at `/admin/settings`, backed by `notification_settings` (migration `0022`) and enforced by `isNotificationDisabled()` (`src/lib/notifications/settings.ts`) inside the four helpers + the direct send-sites. Fail-open; must-send/critical notifications (receipts, welcome, intake_complete, deliverable_ready, client session reminders, auth) have no row and always send.
