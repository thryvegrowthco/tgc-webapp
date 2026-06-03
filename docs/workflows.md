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
  4. Inserts bookings row (status: 'confirmed')
  5. Updates availability_slots.is_booked = true
  6. Inserts payments row
  7. Promise.allSettled([
       sendBookingConfirmation(client email),
       sendAdminBookingAlert(Rachel's email),
       syncBookingToGHL(GHL contact upsert)
     ]) ← failures don't block the 200 response
        │
        ▼
Client redirected to /book/success?session_id=...
  BookingSuccessClient reads session ID, fetches confirmation details, displays them
```

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
  5. Return { ok: true } → ConsultationForm shows "Request received!"
```

**Why separate from /book:** `/book` is the paid Stripe session selector. `/consultation` is the
free-consult entry point — all primary marketing CTAs ("Book a Free 30-Minute Consultation Call"
in Header, Home final CTA, AboutCTA, all SectionCTA usages, FAQ + contact inline links, HomeHero
"Start Your Growth", testimonials "Work with Rachel") route here. Repeat customers / users who
want a paid session directly can still reach `/book` from the consultation page sidebar, the
dashboard, or the `/services/interview-prep` page.

**Best-effort behavior:** Auto-reply and GHL sync are wrapped in their own try/catch — if either
fails, the request still succeeds for the submitter because Rachel already has the admin alert.
This matches the booking-flow philosophy of not blocking on non-critical side effects.

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


