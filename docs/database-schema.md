# Database Schema — Thryve Growth Co.

All tables live in the Supabase `public` schema. Migrations are in `supabase/migrations/`.

---

## Tables

### `profiles`

Extends `auth.users`. One row per registered user. Created automatically by the `handle_new_user` trigger on every new Supabase Auth signup.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | — | Primary key; FK to `auth.users.id` |
| `full_name` | `TEXT` | `NULL` | Set from `raw_user_meta_data.full_name` on signup |
| `email` | `TEXT` | — | Unique; copied from auth user |
| `phone` | `TEXT` | `NULL` | — |
| `role` | `TEXT` | `'client'` | CHECK: `'client'` or `'admin'`; set manually in Supabase — no UI |
| `avatar_url` | `TEXT` | `NULL` | Not currently used in UI |
| `company` | `TEXT` | `NULL` | — |
| `job_title` | `TEXT` | `NULL` | — |
| `ghl_contact_id` | `TEXT` | `NULL` | GoHighLevel contact ID returned after upsert |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Key behavior:** The `is_admin()` security definer function (`SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`) is used in all admin RLS policies. Never evaluate the admin role in application code without also going through Supabase — the RLS policies are the authoritative check.

---

### `availability_slots`

Rachel's bookable calendar slots. Clients see these when selecting a date/time on the booking page.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `slot_date` | `DATE` | — | — |
| `start_time` | `TIME` | — | — |
| `end_time` | `TIME` | — | — |
| `service_type` | `TEXT` | `NULL` | If NULL, any service can book it |
| `is_booked` | `BOOLEAN` | `FALSE` | Set to `TRUE` by the Stripe webhook; never set by client |
| `pattern_id` | `UUID` | `NULL` | FK → `availability_patterns.id` (`ON DELETE SET NULL`). NULL = one-off slot created via `BulkSlotForm`; otherwise, this slot was materialized from a recurring pattern and is eligible for rebuild-forward replacement |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Constraint:** `UNIQUE (slot_date, start_time)` — prevents duplicate slots at the same time. The pattern materialization routine relies on this for idempotency.

**Key behavior:** `deleteAvailabilitySlot` in `src/app/actions/booking.ts` checks `is_booked` before deleting and refuses if the slot is taken.

---

### `availability_patterns`

Recurring weekly availability. Each row is one time block on one day-of-week. Many rows compose Rachel's full weekly schedule. The daily `/api/cron/extend-availability` materializes active patterns into `availability_slots` rows for a rolling 8-week window.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `day_of_week` | `INT` | — | 0 = Sunday, 6 = Saturday; CHECK 0..6 |
| `start_time` | `TIME` | — | Central wall-clock time |
| `end_time` | `TIME` | — | Central wall-clock time; CHECK end > start |
| `slot_duration_minutes` | `INT` | `NULL` | If NULL, the whole time block is one slot. Otherwise the block is split into N-minute slots (30 / 60 / 90) |
| `service_type` | `TEXT` | `NULL` | NULL = any service; else one of the hardcoded SERVICE_TYPES |
| `effective_from` | `DATE` | `CURRENT_DATE` | Inclusive |
| `effective_until` | `DATE` | `NULL` | NULL = recurs forever |
| `is_active` | `BOOLEAN` | `TRUE` | Soft delete via `deletePattern` sets this to FALSE and removes future unbooked slots |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Bumped on every upsert |

**Indexes:** `(is_active, day_of_week)` for the cron lookup; `(effective_from, effective_until)` for range checks.

**RLS:** admin-only via `is_admin()`.

**Key behavior:** `upsertPattern` and `togglePatternActive` both call `rebuildForward(patternId, today)` after writing the row, so changes appear immediately without waiting for the cron.

---

### `availability_blackouts`

Vacation, holidays, conferences — date ranges during which no slots should be generated from patterns.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `start_date` | `DATE` | — | Inclusive |
| `end_date` | `DATE` | — | Inclusive; CHECK end >= start |
| `reason` | `TEXT` | `NULL` | Free-form ("Vacation", "Holiday") |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Index:** `(start_date, end_date)`.

**RLS:** admin-only via `is_admin()`.

**Key behavior:** `addBlackout` deletes existing unbooked, pattern-derived slots in the range (one-off slots stay) and returns counts. Already-booked sessions inside the range are NOT removed — Rachel is warned via toast so she can reach out to the clients.

---

### `bookings`

One record per completed checkout, created by the Stripe webhook after `checkout.session.completed`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | `NULL` | FK to `profiles.id` |
| `slot_id` | `UUID` | `NULL` | FK to `availability_slots.id`; NULL for non-bookable services |
| `service_type` | `TEXT` | — | Human-readable service name |
| `status` | `TEXT` | `'pending'` | CHECK: `pending`, `confirmed`, `completed`, `cancelled` |
| `client_notes` | `TEXT` | `NULL` | Submitted by client during booking |
| `admin_notes` | `TEXT` | `NULL` | Not currently populated via UI |
| `stripe_payment_intent_id` | `TEXT` | `NULL` | — |
| `stripe_session_id` | `TEXT` | `NULL` | Checkout session ID |
| `amount_cents` | `INT` | `NULL` | Amount charged in cents |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Key behavior:** Created in webhook with `status = 'confirmed'`. Status can only be changed to `completed` or `cancelled` via direct Supabase access — there is no admin UI for this.

---

### `payments`

Financial record per transaction. Always created alongside (or instead of) a booking record.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | `NULL` | FK to `profiles.id` |
| `booking_id` | `UUID` | `NULL` | FK to `bookings.id`; NULL for subscription payments |
| `stripe_payment_intent_id` | `TEXT` | — | UNIQUE constraint |
| `stripe_subscription_id` | `TEXT` | `NULL` | Populated for subscription payments |
| `amount_cents` | `INT` | — | Required |
| `currency` | `TEXT` | `'usd'` | — |
| `status` | `TEXT` | — | Value from Stripe (`paid`, etc.) |
| `service_type` | `TEXT` | `NULL` | — |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `documents`

Metadata for files uploaded by admin to a client. Actual file lives in Supabase Storage.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | `NULL` | FK to `profiles.id` — the client who can see it |
| `uploaded_by` | `UUID` | `NULL` | FK to `profiles.id` — always an admin |
| `filename` | `TEXT` | — | Display filename |
| `storage_path` | `TEXT` | — | Key in Supabase Storage (e.g., `{clientId}/{ts}-{name}`) |
| `file_size_bytes` | `INT` | `NULL` | — |
| `category` | `TEXT` | `NULL` | CHECK: `resume`, `cover_letter`, `notes`, `worksheet`, `template`, `deliverable`, `resume_rewrite`, `hr_doc`, `other` |
| `description` | `TEXT` | `NULL` | Optional admin note about the file |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Key behavior:** Download uses a 60-minute signed URL via `GET /api/documents/download`. Deletion removes both the DB row and the Storage object. When the admin uploads with category `deliverable`, `resume_rewrite`, or `hr_doc`, `uploadDocument` server action also fires the `deliverable_ready` email to the client (per-document idempotency via `automation_log` event_key `deliverable_ready_sent:{documentId}`).

---

### `watchlist_profiles`

One per Job Alerts subscriber. Created/activated by the Stripe webhook on subscription checkout completion.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | — | FK to `profiles.id`; UNIQUE — one profile per client |
| `target_roles` | `TEXT[]` | `NULL` | Array of role titles |
| `industries` | `TEXT[]` | `NULL` | — |
| `locations` | `TEXT[]` | `NULL` | — |
| `salary_min` | `INT` | `NULL` | Annual salary in dollars |
| `salary_max` | `INT` | `NULL` | — |
| `remote_preference` | `TEXT` | `NULL` | CHECK: `remote`, `hybrid`, `onsite`, `any` |
| `experience_level` | `TEXT` | `NULL` | — |
| `preferences_notes` | `TEXT` | `NULL` | Free-text notes from client to Rachel |
| `employment_types` | `TEXT[]` | `NULL` | `full_time`/`part_time`/`contract`/`temporary` (added 0016) |
| `keywords` | `TEXT[]` | `NULL` | Scored against job title + description (0016) |
| `skills` | `TEXT[]` | `NULL` | Scored against job description (0016) |
| `certifications` | `TEXT[]` | `NULL` | Scored against job description (0016) |
| `education` | `TEXT` | `NULL` | Free-text (0016) |
| `preferred_employers` | `TEXT[]` | `NULL` | Scoring **boost** when job company matches (0016) |
| `excluded_employers` | `TEXT[]` | `NULL` | Hard **exclude** — matching jobs score 0 (0016) |
| `job_board_preferences` | `TEXT[]` | `NULL` | Where to focus searches; informational (0016) |
| `work_environment` | `TEXT` | `NULL` | Free-text culture/pace preference (0016) |
| `travel_preference` | `TEXT` | `NULL` | `none`/`occasional`/`frequent`/`willing` (0016) |
| `work_authorization_notes` | `TEXT` | `NULL` | Visa/citizenship notes (0016) |
| `must_haves` | `TEXT[]` | `NULL` | Hard **gate** — jobs missing any are excluded (0016) |
| `nice_to_haves` | `TEXT[]` | `NULL` | Additive scoring bonus (0016) |
| `review_status` | `TEXT` | `'pending_review'` | CHECK: `pending_review`, `reviewed`. Non-blocking admin curation surface (0016) |
| `reviewed_at` | `TIMESTAMPTZ` | `NULL` | Set when Rachel marks reviewed (0016) |
| `reviewed_by` | `UUID` | `NULL` | FK → `profiles.id` (0016) |
| `subscription_status` | `TEXT` | `'active'` | CHECK (0016): `active`, `inactive`, `paused`, `cancelled`, `expired`. Only `active` unlocks the watchlist UI + gets cron emails |
| `stripe_subscription_id` | `TEXT` | `NULL` | Used by admin pause/reactivate/cancel actions + webhook sync |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Updated on `saveWatchlistProfile` |

**Access gating:** `getWatchlistAccess()` (`src/lib/watchlist/access.tsx`) blocks the job-alerts dashboard pages (`/dashboard/watchlist`, `/watchlist/setup`, job-alerts portion of `/applications`) when `subscription_status != 'active'`, showing a reactivate CTA. Booking/coaching clients (no row) are unaffected. The Stripe webhook keeps `subscription_status` in sync; admin overrides (`pauseWatchlist`/`reactivateWatchlist`/`cancelWatchlist` in `src/app/actions/watchlist.ts`) also act on the Stripe subscription.

---

### `job_listings`

Shared pool of all job listings — both Rachel's manually added jobs and JSearch API results.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `title` | `TEXT` | — | Required |
| `company` | `TEXT` | — | Required |
| `location` | `TEXT` | `NULL` | City/state string |
| `is_remote` | `BOOLEAN` | `FALSE` | — |
| `url` | `TEXT` | `NULL` | Apply link |
| `description` | `TEXT` | `NULL` | Truncated to 2000 chars for JSearch results |
| `salary_range` | `TEXT` | `NULL` | Human-readable, e.g. `$80k–$100k` |
| `source` | `TEXT` | `NULL` | `'manual'` or `'jsearch'` |
| `external_id` | `TEXT` | `NULL` | JSearch job ID; used for deduplication |
| `date_posted` | `DATE` | `NULL` | — |
| `is_active` | `BOOLEAN` | `TRUE` | Not currently used to filter queries |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `client_job_matches`

Join table connecting a client to job listings assigned to them.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | `NULL` | FK to `profiles.id` |
| `job_id` | `UUID` | `NULL` | FK to `job_listings.id` |
| `status` | `TEXT` | `'new'` | CHECK (widened in 0017): `interested`, `applied`, `interviewing`, `final_interview`, `offer_received`, `accepted`, `declined`, `rejected`, `withdrawn`, plus `new`, `saved`, `not_a_fit`, `archived`, and legacy `offer` (UI maps → `offer_received`) |
| `rachel_recommended` | `BOOLEAN` | `FALSE` | Rachel's highlight flag → "Curated by Rachel" badge |
| `client_notes` | `TEXT` | `NULL` | Client's private note (editable on the job card / tracker) |
| `application_date` | `DATE` | `NULL` | Auto-stamped when status → `applied`; editable in tracker |
| `interview_date` | `TIMESTAMPTZ` | `NULL` | Editable in the tracker detail panel |
| `score` | `INTEGER` | `NULL` | 0–100 score from the auto-matching engine (`src/lib/matching/score.ts`) |
| `score_label` | `TEXT` | `NULL` | CHECK: `strong`, `good`, `maybe`. Set by auto-matcher; null for manually-added matches |
| `rachel_notes` | `TEXT` | `NULL` | Admin-only curation note — never selected in client queries (0017) |
| `match_reason` | `TEXT` | `NULL` | "Why it matches" — shown to client on curated matches (0017) |
| `priority_level` | `TEXT` | `NULL` | CHECK: `high`, `medium`, `low` (0017) |
| `recommended_action` | `TEXT` | `NULL` | Rachel's suggested next step, shown to client (0017) |
| `salary_offered` | `INT` | `NULL` | Offer amount, set in the tracker (0017) |
| `next_steps` | `TEXT` | `NULL` | Client's tracker next-steps note (0017) |
| `is_favorite` | `BOOLEAN` | `FALSE` | Client star toggle; powers the Saved & Favorites tab (0017) |
| `resume_document_id` | `UUID` | `NULL` | FK → `documents.id` — resume used for this application (0017) |
| `cover_letter_document_id` | `UUID` | `NULL` | FK → `documents.id` — cover letter used (0017) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Used by cron to find "new this week" matches |

**Constraint:** `UNIQUE (client_id, job_id)` — a job can only be assigned to a client once. Upserts use `ON CONFLICT DO NOTHING`.

---

### `leads`

Prospects captured from the public `JobWatchlistLeadForm` on `/services/job-alerts`. Distinct from `profiles` because leads don't have Supabase auth accounts yet.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `full_name` | `TEXT` | — | Required |
| `email` | `TEXT` | — | Required, indexed |
| `phone` | `TEXT` | `NULL` | — |
| `current_position` | `TEXT` | `NULL` | Renamed from `current_role` to avoid Postgres reserved-word collision |
| `target_role` | `TEXT` | `NULL` | — |
| `location` | `TEXT` | `NULL` | — |
| `remote_preference` | `TEXT` | `NULL` | CHECK: `remote`, `hybrid`, `onsite`, `any` |
| `timeline` | `TEXT` | `NULL` | e.g., `actively_searching`, `next_3_months`, `next_6_months`, `exploring` |
| `notes` | `TEXT` | `NULL` | Free-text from the lead |
| `source` | `TEXT` | `'job_watchlist'` | Lead-source tracking |
| `status` | `TEXT` | `'new'` | CHECK: `new`, `contacted`, `qualified`, `converted`, `lost` |
| `admin_notes` | `TEXT` | `NULL` | Internal notes; visible only on `/admin/leads/[id]` |
| `converted_profile_id` | `UUID` | `NULL` | FK to `profiles.id` once the lead becomes a client |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Indexed DESC for the leads list |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Updated on status / admin-notes changes |

**Indexes:** `leads_status_idx`, `leads_email_idx`, `leads_created_at_idx`.

**RLS:** authenticated admins can read/write. Public inserts go through `POST /api/leads` using the service-role client (bypasses RLS).

---

### `admin_client_notes`

Private session notes added by Rachel to a client's record. Clients cannot see these.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | `NULL` | FK to `profiles.id` with `ON DELETE CASCADE` |
| `note` | `TEXT` | — | Required |
| `session_date` | `DATE` | `NULL` | Optional; defaults to `created_at` date if not set |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `blog_posts`

Blog post content and metadata. Content is stored as Tiptap ProseMirror JSON.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `slug` | `TEXT` | — | UNIQUE; becomes the URL path `/blog/{slug}` |
| `title` | `TEXT` | — | — |
| `excerpt` | `TEXT` | `NULL` | Shown on blog index page |
| `content` | `JSONB` | `NULL` | Tiptap ProseMirror JSON |
| `featured_image_path` | `TEXT` | `NULL` | Public URL (served via `getPublicUrl`) |
| `published` | `BOOLEAN` | `FALSE` | Controls public visibility |
| `published_at` | `TIMESTAMPTZ` | `NULL` | Set once on first publish; preserved on updates |
| `author_id` | `UUID` | `NULL` | FK to `profiles.id` |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Not auto-updated; set explicitly in `updateBlogPost` |

---

### `newsletter_subscribers`

Email subscribers collected via the footer/blog/landing newsletter forms. Extended in migration `0009` with interest tags, engagement tracking, and a per-row unsubscribe token.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `email` | `TEXT` | — | UNIQUE |
| `first_name` | `TEXT` | `NULL` | Collected in the `variant="full"` form on `/newsletter` |
| `source` | `TEXT` | `NULL` | Tracks which form they used (`footer`, `blog`, `newsletter-landing`) |
| `ghl_contact_id` | `TEXT` | `NULL` | GoHighLevel contact ID after sync |
| `subscribed_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `unsubscribed_at` | `TIMESTAMPTZ` | `NULL` | Set by `/api/newsletter/unsubscribe/[token]` and the marketing unsubscribe page |
| `interests` | `TEXT[]` | `'{}'` | Slugs from `src/lib/newsletter/interests.ts` (GIN-indexed) |
| `last_engaged_at` | `TIMESTAMPTZ` | `NULL` | Updated by the Resend webhook on `email.opened` / `email.clicked` |
| `last_sent_at` | `TIMESTAMPTZ` | `NULL` | Stamped by `sendIssue` after a successful batch |
| `welcome_sent_at` | `TIMESTAMPTZ` | `NULL` | Idempotency for the welcome email |
| `unsubscribe_token` | `TEXT` | `encode(gen_random_bytes(16),'hex')` | UNIQUE; used in unsubscribe + manage URLs |

---

### `newsletter_issues`

One row per weekly newsletter draft → scheduled → sent.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `title` | `TEXT` | — | Rachel's internal name; not shown to subscribers |
| `subject` | `TEXT` | `''` | Email subject line |
| `preheader` | `TEXT` | `''` | Inbox-preview text |
| `content` | `JSONB` | — | Tiptap ProseMirror JSON (`newsletterEditorExtensions`) |
| `status` | `TEXT` | `'draft'` | `draft` → `pending_approval` → `scheduled` → `sending` → `sent` / `failed` |
| `scheduled_for` | `TIMESTAMPTZ` | `NULL` | When the cron should send it |
| `sent_at` | `TIMESTAMPTZ` | `NULL` | Stamped after a successful send |
| `sent_count` | `INT` | `0` | Recipients delivered to in the last send |
| `failed_count` | `INT` | `0` | Recipients that hit a send error |
| `template_id` | `UUID` | `NULL` | Optional FK to `newsletter_templates` |
| `target_interests` | `TEXT[]` | `'{}'` | Empty array = send to all; otherwise overlap-match subscribers |
| `featured_blog_post_id` | `UUID` | `NULL` | Optional FK to `blog_posts` |
| `author_id` | `UUID` | `NULL` | FK to `profiles` |
| `approved_by` | `UUID` | `NULL` | FK to `profiles` (the admin who approved) |
| `approved_at` | `TIMESTAMPTZ` | `NULL` | — |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | — |

Index: `(status, scheduled_for)` for the hourly cron's hot query.

---

### `newsletter_templates`

Reusable section layouts. The migration seeds one row tagged `is_default = TRUE` with the 7-section Thryve structure.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `name` | `TEXT` | — | — |
| `description` | `TEXT` | `NULL` | — |
| `content` | `JSONB` | — | Tiptap JSON |
| `is_default` | `BOOLEAN` | `FALSE` | Partial unique index ensures only one default |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `newsletter_sends`

Per-recipient ledger of every send. Required so Resend webhook events can be correlated back to the issue + subscriber via `resend_message_id`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `issue_id` | `UUID` | — | FK to `newsletter_issues` (cascade) |
| `subscriber_id` | `UUID` | — | FK to `newsletter_subscribers` (cascade) |
| `resend_message_id` | `TEXT` | `NULL` | UNIQUE — Resend's id from `resend.batch.send()` |
| `status` | `TEXT` | `'sent'` | `sent`, `failed`, or `bounced` |
| `error` | `TEXT` | `NULL` | Up to 500 chars of error message on failure |
| `sent_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `newsletter_events`

Raw event log from the Resend webhook. `UNIQUE(resend_event_id)` makes the handler idempotent under retries.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `send_id` | `UUID` | `NULL` | FK to `newsletter_sends` (cascade) |
| `subscriber_id` | `UUID` | `NULL` | FK to `newsletter_subscribers` (cascade) |
| `issue_id` | `UUID` | `NULL` | FK to `newsletter_issues` (cascade) |
| `event_type` | `TEXT` | — | `delivered`, `opened`, `clicked`, `bounced`, `complained`, `unsubscribed` |
| `url` | `TEXT` | `NULL` | Populated for `clicked` events |
| `user_agent` | `TEXT` | `NULL` | From the click payload |
| `occurred_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `resend_event_id` | `TEXT` | `NULL` | UNIQUE |

---

### `newsletter_ideas`

Lightweight idea inbox for Rachel — captured from the newsletter dashboard.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `body` | `TEXT` | — | The note itself |
| `used_in_issue_id` | `UUID` | `NULL` | FK to `newsletter_issues` (optional, future use) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

---

### `admin_notifications`

One row per notable event Rachel should see in-app. Mirrors the email alerts but lets her clear from the bell instead of triaging her inbox. Added in migration `0013_admin_ops.sql`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `type` | `TEXT` | — | CHECK (widened in 0021): `new_booking`, `intake_submitted`, `client_doc_upload`, `intake_overdue`, `session_in_24h`, `new_subscriber`, `subscriber_unsubscribed`, `subscriber_updated`, `new_subscription`, `subscription_issue`, `watchlist_updated`, `application_status`, `client_message` |
| `title` | `TEXT` | — | Headline shown in the bell + inbox |
| `body` | `TEXT` | `NULL` | Optional supporting line |
| `link` | `TEXT` | `NULL` | Where clicking the row sends Rachel (usually `/admin/clients/{id}#...`) |
| `related_booking_id` | `UUID` | `NULL` | FK to `bookings.id` (ON DELETE SET NULL) |
| `related_client_id` | `UUID` | `NULL` | FK to `profiles.id` (ON DELETE SET NULL) |
| `read_at` | `TIMESTAMPTZ` | `NULL` | When Rachel marked it read (NULL = unread) |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Indexes:** partial index on `created_at DESC WHERE read_at IS NULL` for the unread-count query; full index on `created_at DESC` for the inbox.

**Writers:** Stripe webhook (`new_booking`, `new_subscription`, `subscription_issue`), `saveIntake` action (`intake_submitted`, `client_doc_upload`), intake-overdue cron (`intake_overdue`), session-reminders cron (`session_in_24h`), newsletter routes (`new_subscriber`, `subscriber_unsubscribed`, `subscriber_updated`), `saveWatchlistProfile` (`watchlist_updated`), `updateMatchStatus` (`application_status`), `sendMessage` (`client_message`). Helpers: `src/lib/notifications/admin.ts → createAdminNotification` (bell only) and `notifyAdmin` (email + bell in one call).

---

### `client_notifications`

Client-facing equivalent of `admin_notifications` — one row per event a client should see in their dashboard bell. Added in `0018_client_notifications.sql`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `client_id` | `UUID` | — | FK to `profiles.id` (ON DELETE CASCADE) |
| `type` | `TEXT` | — | CHECK: `new_job_match`, `curated_job_match`, `watchlist_updated`, `application_reminder`, `message_received` |
| `title` | `TEXT` | — | Headline in the bell |
| `body` | `TEXT` | `NULL` | Optional supporting line |
| `link` | `TEXT` | `NULL` | Where the row navigates (e.g. `/dashboard/watchlist`) |
| `related_match_id` | `UUID` | `NULL` | FK to `client_job_matches.id` (ON DELETE SET NULL) |
| `read_at` | `TIMESTAMPTZ` | `NULL` | NULL = unread |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**RLS:** clients SELECT + UPDATE (mark read) their own rows; admins SELECT all. Writes go through the service-role client.

**Writers (`src/lib/notifications/client.ts → createClientNotification`):** auto-match + JSearch fetch (`new_job_match`), `assignJobToClient` (`curated_job_match`), `saveWatchlistProfile` edits (`watchlist_updated`), `sendMessage` admin→client (`message_received`), `/api/cron/application-reminders` (`application_reminder`). Email pairs are sent via `sendTemplated` using the matching `email_templates` keys (seeded in 0018).

---

### `job_sources`

Registry of automated job-feed sources, toggleable in `/admin/integrations`. Added in `0019_job_sources.sql`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `provider` | `TEXT` | — | UNIQUE; the source key written to `job_listings.source` (`jsearch`, `usajobs`) |
| `label` | `TEXT` | — | Display name in the admin toggle |
| `enabled` | `BOOLEAN` | `FALSE` | Only enabled sources are pulled by `/api/cron/job-feed` |
| `sort_order` | `INT` | `0` | Lower renders first |
| `updated_at` / `updated_by` / `created_at` | — | — | `updated_by` FK → `profiles.id` (ON DELETE SET NULL) |

**RLS:** admin-only via `is_admin()`. **Seed:** `jsearch` (enabled), `usajobs` (disabled). Resolved against the registered adapters in `src/lib/job-api/sources.ts` (`getEnabledSources`). `job_listings.source` stays free-text — no enum migration needed.

---

### `tracking_pixels`

Catalog of visitor tracking + conversion pixels (GA4, GTM, Meta, Google Ads, LinkedIn Insight, Microsoft Clarity). Added in migration `0015_tracking_pixels.sql`. Pixel IDs are not secrets — they appear in any page source the moment the script fires — so the column is plain `TEXT`, no encryption.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `provider` | `TEXT` | — | UNIQUE; one of `google_analytics_4`, `google_tag_manager`, `meta_pixel`, `google_ads`, `linkedin_insight`, `microsoft_clarity` (see `src/lib/tracking/scripts.ts` `PROVIDER_SCRIPTS` map) |
| `name` | `TEXT` | — | Friendly display name used on `/admin/integrations` |
| `description` | `TEXT` | — | One-line blurb shown in the admin card |
| `id_placeholder` | `TEXT` | `NULL` | Format hint shown as the text-input placeholder |
| `pixel_id` | `TEXT` | `NULL` | Rachel pastes this in admin. `NULL` until configured. |
| `enabled` | `BOOLEAN` | `FALSE` | Public visibility toggle |
| `sort_order` | `INT` | `0` | Lower numbers render first in admin + privacy disclosure |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `updated_by` | `UUID` | `NULL` | FK to `profiles.id` ON DELETE SET NULL |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**RLS:** anonymous + clients can `SELECT` rows where `enabled = TRUE AND pixel_id IS NOT NULL AND length(trim(pixel_id)) > 0` (draft state is never exposed). Admins have full access.

**Consumed by:**
- `src/components/tracking/TrackingPixels.tsx` (server component) — pulls live rows and hands them to the client gate
- `src/app/(marketing)/privacy/page.tsx` — dynamic Cookies section reads the same set to list active third-party services + opt-out links
- `src/app/(admin)/admin/integrations/page.tsx` — admin index lists all rows (including disabled) for editing

**Consent gate:** scripts only inject after the visitor accepts the `CookieConsent` banner (writes `cookie_consent` to `localStorage`). The DB never knows about consent — it's a pure browser-side decision.

---

### `resources`

Catalog backing the public `/resources` page. Each row is a downloadable or purchasable template/worksheet. Added in migration `0014_resources.sql`. Hardcoded array previously inlined at the top of the page; moved to Postgres so Rachel can toggle each on/off and edit copy from `/admin/resources` without a deploy.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `slug` | `TEXT` | — | UNIQUE; stable identifier used in URLs and seeds |
| `category` | `TEXT` | — | Free-form; the public page filters/displays the 3 categories defined in the page's `categories` array |
| `title` | `TEXT` | — | Display title |
| `description` | `TEXT` | — | Card body |
| `price` | `TEXT` | — | Free-form display string (`"Free"`, `"$19"`, etc.) |
| `cta_type` | `TEXT` | — | CHECK: `Buy Now`, `Download` — preserves the button-style hint for when URLs are wired in later |
| `enabled` | `BOOLEAN` | `FALSE` | Controls public visibility |
| `sort_order` | `INT` | `0` | Lower numbers render first; seed steps by 10 |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `updated_by` | `UUID` | `NULL` | FK to `profiles.id` ON DELETE SET NULL |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**RLS:** anonymous + clients can `SELECT` rows where `enabled = TRUE` (the public marketing page is unauthenticated); admins have full access.

**Current state:** all 8 seed rows are `enabled = false`. Until Rachel flips the first toggle, `/resources` shows a "More resources coming soon" panel. When enabled, the public card displays a muted "Coming soon" badge in place of the Buy/Download button — URL wiring is a separate follow-up.

---

### `admin_tasks`

Rachel's lightweight to-do list. Tasks can optionally be tied to a booking and/or a client so they surface in the right context. Added in migration `0013_admin_ops.sql`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `title` | `TEXT` | — | Short headline; shown in the task list |
| `description` | `TEXT` | `NULL` | Optional notes |
| `due_at` | `TIMESTAMPTZ` | `NULL` | Sortable in the upcoming/overdue filters |
| `completed_at` | `TIMESTAMPTZ` | `NULL` | NULL = open |
| `related_booking_id` | `UUID` | `NULL` | FK to `bookings.id` (ON DELETE SET NULL) |
| `related_client_id` | `UUID` | `NULL` | FK to `profiles.id` (ON DELETE SET NULL) |
| `created_by` | `UUID` | `NULL` | FK to `profiles.id`; NULL for system-created auto-tasks |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Indexes:**
- partial index on `due_at NULLS LAST WHERE completed_at IS NULL` for the upcoming list
- partial index on `(related_client_id, completed_at) WHERE related_client_id IS NOT NULL` for client detail page
- **unique** partial index on `related_booking_id WHERE title = 'Review intake when submitted'` — makes the Stripe webhook's auto-task insert idempotent via `ON CONFLICT DO NOTHING`

**Auto-creation:**
- Stripe webhook → "Review intake when submitted" (due = `intake_due_at`)
- `saveIntake` action on submit → "Prepare deliverable / session" (due = session_at − 12h, else +3 days)

---

### Views

| View | Purpose |
|---|---|
| `newsletter_issue_stats` | Per-issue aggregate: `delivered`, `opened`, `clicked`, `unique_opens`, `unique_clicks`, `bounces`, `complaints`. Used by the admin dashboard and issue detail page. |
| `newsletter_top_links` | Most-clicked URLs per issue. Sourced from `newsletter_events` where `event_type = 'clicked'`. |

---

## RLS Policy Summary

| Table | Anon | Client (own) | Admin | Service role |
|---|---|---|---|---|
| `profiles` | None | SELECT own, UPDATE own, INSERT own | SELECT all | Full (bypasses RLS) |
| `availability_slots` | None | SELECT all | ALL | Full |
| `bookings` | None | SELECT own, INSERT own | SELECT all, UPDATE all | Full |
| `payments` | None | SELECT own | ALL | Full |
| `documents` | None | SELECT own | INSERT, DELETE, SELECT all | Full |
| `watchlist_profiles` | None | SELECT own, INSERT own, UPDATE own | SELECT all, INSERT, UPDATE | Full |
| `job_listings` | None | SELECT all | ALL | Full |
| `client_job_matches` | None | SELECT own, UPDATE own | SELECT all, INSERT, UPDATE | Full |
| `leads` | None | None | SELECT all, INSERT, UPDATE | Full (used by `/api/leads` for public inserts) |
| `admin_client_notes` | None | None | ALL | Full |
| `blog_posts` | SELECT published | SELECT published | ALL | Full |
| `newsletter_subscribers` | INSERT only | None | ALL | Full (used by `/api/newsletter*` routes for public subscribe/unsubscribe/manage) |
| `newsletter_issues` | None | None | ALL | Full |
| `newsletter_templates` | None | None | ALL | Full |
| `newsletter_sends` | None | None | ALL | Full |
| `newsletter_events` | None | None | ALL | Full (writes from Resend webhook) |
| `newsletter_ideas` | None | None | ALL | Full |
| `admin_notifications` | None | None | ALL | Full |
| `admin_tasks` | None | None | ALL | Full |
| `resources` | SELECT enabled | SELECT enabled | ALL | Full |
| `tracking_pixels` | SELECT live | SELECT live | ALL | Full |

Note: "Service role" (`createServiceClient()`) bypasses all RLS policies. Only used in the Stripe webhook and admin server actions where the caller is already verified.

---

## Storage Bucket

**Bucket:** `documents` (private, not public)

**File size limit:** 25 MB (`26214400` bytes)

**Allowed MIME types:** PDF, DOC, DOCX, XLS, XLSX, TXT, JPEG, PNG

**Storage RLS policies:**

| Policy | Applies to | Rule |
|---|---|---|
| Admins full access | ALL operations | `bucket_id = 'documents' AND is admin` |
| Client read own | SELECT only | `bucket_id = 'documents' AND foldername(name)[1] = auth.uid()::text` |

**Path conventions:**
- Client documents: `{clientId}/{timestamp}-{sanitizedFilename}`
- Blog images: `blog/{timestamp}-{filename}`

**Note on blog images:** Blog images use `getPublicUrl()` which generates a public-facing URL even though the bucket is marked private. This is intentional — blog images need to be publicly accessible. Client documents use signed URLs (`createSignedUrl`) instead. The two patterns are intentionally different.

---

## Postgres Functions and Triggers

### `is_admin()` — Security Definer

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

Used in all admin RLS policies. `SECURITY DEFINER` means it runs with the permissions of the function owner (bypassing RLS on the `profiles` table for the lookup itself). This prevents infinite recursion in RLS evaluation.

### `handle_new_user()` — Trigger

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

Fires on every new Supabase Auth signup. Creates a `profiles` row with `id`, `email`, and `full_name` from `raw_user_meta_data`. This is why `profiles` rows always exist after signup — no explicit insert needed in application code.
