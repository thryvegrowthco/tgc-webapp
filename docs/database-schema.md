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
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Constraint:** `UNIQUE (slot_date, start_time)` — prevents duplicate slots at the same time.

**Key behavior:** `deleteAvailabilitySlot` in `src/app/actions/booking.ts` checks `is_booked` before deleting and refuses if the slot is taken.

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
| `category` | `TEXT` | `NULL` | CHECK: `resume`, `cover_letter`, `notes`, `worksheet`, `template`, `other` |
| `description` | `TEXT` | `NULL` | Optional admin note about the file |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | — |

**Key behavior:** Download uses a 60-minute signed URL via `GET /api/documents/download`. Deletion removes both the DB row and the Storage object.

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
| `subscription_status` | `TEXT` | `'active'` | `'active'` or `'cancelled'`; only `'active'` rows get cron emails |
| `stripe_subscription_id` | `TEXT` | `NULL` | Stored for reference; not used to drive access |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Updated on `saveWatchlistProfile` |

**Known gap:** `subscription_status` is NOT updated when a Stripe subscription is cancelled. Must be updated manually until the webhook handler is added.

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
| `status` | `TEXT` | `'new'` | CHECK: `new`, `saved`, `interested`, `applied`, `not_a_fit`, `archived`, `interviewing`, `offer` |
| `rachel_recommended` | `BOOLEAN` | `FALSE` | Rachel's highlight flag |
| `client_notes` | `TEXT` | `NULL` | Not currently exposed in UI |
| `application_date` | `DATE` | `NULL` | Not currently exposed in UI |
| `interview_date` | `TIMESTAMPTZ` | `NULL` | Not currently exposed in UI |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | Used by cron to find "new this week" matches |

**Constraint:** `UNIQUE (client_id, job_id)` — a job can only be assigned to a client once. Upserts use `ON CONFLICT DO NOTHING`.

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

Email subscribers collected via the footer/blog newsletter form.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | — |
| `email` | `TEXT` | — | UNIQUE |
| `first_name` | `TEXT` | `NULL` | Not collected in current form UI |
| `source` | `TEXT` | `NULL` | Tracks which form they used |
| `ghl_contact_id` | `TEXT` | `NULL` | GoHighLevel contact ID after sync |
| `subscribed_at` | `TIMESTAMPTZ` | `NOW()` | — |
| `unsubscribed_at` | `TIMESTAMPTZ` | `NULL` | Nullable; not currently set via UI |

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
| `admin_client_notes` | None | None | ALL | Full |
| `blog_posts` | SELECT published | SELECT published | ALL | Full |
| `newsletter_subscribers` | INSERT only | None | ALL | Full |

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
