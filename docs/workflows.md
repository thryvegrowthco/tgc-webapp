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
Every Monday 9AM UTC: GET /api/cron/job-alerts (Vercel Cron)
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
Supabase sends verification email with link to /auth/callback?code=...
        │
        ▼
Client clicks link → /auth/callback (src/app/auth/callback/route.ts)
  supabase.auth.exchangeCodeForSession(code)
  Sets session cookie
  Redirects to /dashboard (or ?next= param if set)
        │
        ▼
handle_new_user() Postgres trigger fires on auth.users INSERT
  Creates profiles row: { id, email, full_name, role: 'client' }
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
Client clicks email link → /auth/callback
  Exchanges code, sets session → redirects to /dashboard/profile
        │
        ▼
Client on profile page → enters new password
        │
        ▼
updatePassword server action
  supabase.auth.updateUser({ password: newPassword })
```
