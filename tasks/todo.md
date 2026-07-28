# Thryve — 7-item fixes/enhancements (progress tracker)

Full plan: `~/.claude/plans/i-have-a-list-gentle-coral.md`. Phases are independent and shipped one at a time with review between them.

| # | Item | Phase | Status |
|---|------|-------|--------|
| 1 | Newsletter time shows wrong (9am → 2pm) | 1 | ✅ done |
| 3 | Newsletter analytics all 0 | 1 | ✅ diagnosed + banner shipped (config next) |
| 4 | Free gif/image for newsletters & blogs | 2 | ✅ done |
| 5 | Blogs won't add/download images | 2 | ✅ done |
| 6 | Resources: downloadable + view/download counts | 3 | ✅ built (needs migration 0030 applied) |
| 2 | Watchlist: expire closed jobs → inactive tabs | 4 | ✅ built (needs migration 0031 + cron registered) |
| 7/7a | Bookings workflow (already exists) → make findable | 5 | ⬜ |

---

## Phase 1 — Newsletter accuracy ✅ COMPLETE (code)

### 1a. Timezone (#1)
- [x] Added `centralDatetimeLocalToUtcIso` + `utcIsoToCentralDatetimeLocal` to `src/lib/time/central.ts`.
- [x] Storage now Central-explicit: `NewsletterIssueForm.tsx` saves via `centralDatetimeLocalToUtcIso` and populates the input via `utcIsoToCentralDatetimeLocal` (no longer depends on the admin's browser timezone).
- [x] Display fixed on `newsletter/page.tsx`, `newsletter/issues/page.tsx`, `NewsletterIssueForm.tsx`, `subscribers/page.tsx`, `templates/page.tsx` → `formatCentralDateTime`/`formatCentralDate` + "CT" label.

### 1b. Analytics = 0 (#3)
- [x] Root cause: **Resend dashboard config**, not code (pipeline is correct end-to-end).
- [x] Added a self-diagnosing amber banner on the newsletter dashboard (sent issues exist + `newsletter_events` empty).
- [x] Documented the fix in `docs/integrations.md` (register webhook + set `RESEND_WEBHOOK_SECRET` + enable Open/Click tracking on the domain).
- [ ] **Rachel/owner action (external):** in Resend, register `https://thryvegrowth.co/api/webhooks/resend` (delivered/opened/clicked/bounced/complained), confirm `RESEND_WEBHOOK_SECRET`, and toggle Open + Click tracking on the sending domain.

### Verification
- [x] `tsc --noEmit` clean.
- [x] Changed files lint-clean (only a pre-existing `Date.now()` warning on line 54 remains — not introduced here, not build-blocking in Next 16).
- [x] Timezone helpers unit-verified (7/7): 9am CT → 14:00Z (summer) / 15:00Z (winter), round-trips, and 14:00Z now displays "9:00 AM".
- [x] Docs updated (rachel-admin-guide, integrations, developer-architecture) + help center regenerated.

### Files touched
- `src/lib/time/central.ts`
- `src/components/admin/NewsletterIssueForm.tsx`
- `src/app/(admin)/admin/newsletter/page.tsx`
- `src/app/(admin)/admin/newsletter/issues/page.tsx`
- `src/app/(admin)/admin/newsletter/subscribers/page.tsx`
- `src/app/(admin)/admin/newsletter/templates/page.tsx`
- `docs/{integrations,developer-architecture,rachel-admin-guide}.md` + `src/lib/help/content.generated.ts`

---

## Phase 2 — Blog + newsletter image/GIF picker ✅ COMPLETE (code)

- [x] Shared `MediaPicker.tsx` dialog: **Upload · GIFs (Giphy) · Photos (Unsplash) · URL** tabs.
- [x] `src/app/actions/media.ts` — `uploadEditorImage` (→ public `blog-images` bucket, type/size validated) + `trackUnsplashDownload` (Unsplash guideline ping).
- [x] Admin-gated proxy routes `GET /api/media/gif` (Giphy) + `GET /api/media/image` (Unsplash); keys server-side only; graceful `{configured:false}` when unset.
- [x] Wired into both `RichTextEditor.tsx` (blog) and `NewsletterEditor.tsx` (newsletter); replaced the old URL-only `window.prompt`.
- [x] Fixed a pre-existing unescaped-quote lint error in the blog editor while there.

### Verification
- [x] `tsc` clean, changed files lint-clean.
- [x] **Full `next build` passed** — `/api/media/gif` + `/api/media/image` compiled into the build (`.next/server/app/api/media/*`).
- [x] Docs updated (env-vars, integrations, developer-architecture — incl. fixing a stale "featured images → documents bucket" note that was actually `blog-images`, rachel-admin-guide) + help regenerated + `.env.local.example`.

### Owner action (optional — only for the search tabs)
- [ ] Add free `GIPHY_API_KEY` (developers.giphy.com) and `UNSPLASH_ACCESS_KEY` (unsplash.com/developers) to `.env.local` + Vercel. Upload + URL tabs already work without them.

### Files added/touched
- Added: `src/app/actions/media.ts`, `src/app/api/media/gif/route.ts`, `src/app/api/media/image/route.ts`, `src/components/admin/MediaPicker.tsx`
- Edited: `src/components/admin/{RichTextEditor,NewsletterEditor}.tsx`, `.env.local.example`, `docs/{environment-variables,integrations,developer-architecture,rachel-admin-guide}.md` + generated help

---

## Phase 3 — Resources: free downloads + view/download tracking ✅ BUILT (migration pending)

- [x] Migration `0030_resource_files_and_tracking.sql`: resources gains `file_path/external_url/file_name/file_size_bytes/view_count/download_count`; new `resource_events` table (admin-read RLS); atomic `increment_resource_view/download` funcs; **private `resource-files` bucket**.
- [x] Actions: `uploadResourceFile` / `removeResourceFile` + `external_url` in `updateResource`.
- [x] `GET /api/resources/download/[slug]` — signed URL (or external redirect) + counts the download. `POST /api/resources/view` — validated view events. `ResourceViewTracker` sendBeacon on `/resources` (session-deduped).
- [x] Public page: real **Download** button for enabled Download resources with a file/link (else "Coming soon"). Admin index + editor show Views/Downloads + file upload/remove + external link field.

### Verification
- [x] `tsc` clean, lint clean, **full `next build` passed** (both `/api/resources/*` routes compiled; `/resources` prerendered).
- [x] Docs (database-schema, developer-architecture, rachel-admin-guide) + help regenerated.
- [ ] **BLOCKED on owner:** apply `supabase/migrations/0030_resource_files_and_tracking.sql` in the Supabase SQL editor. Until then the new columns/table/bucket don't exist and the feature errors.
- [ ] After migration: end-to-end smoke (upload a PDF to a free resource → Download button appears → download increments the count → view beacon increments views).

### Files added/touched
- Added: `supabase/migrations/0030_resource_files_and_tracking.sql`, `src/app/api/resources/download/[slug]/route.ts`, `src/app/api/resources/view/route.ts`, `src/components/marketing/ResourceViewTracker.tsx`
- Edited: `src/types/database.ts`, `src/app/actions/resources.ts`, `src/app/(marketing)/resources/page.tsx`, `src/app/(admin)/admin/resources/page.tsx` + `[id]/page.tsx`, `src/components/admin/ResourceEditForm.tsx`, `docs/{database-schema,developer-architecture,rachel-admin-guide}.md` + generated help

---

## Phase 4 — Watchlist: expiring/closing job matches + Inactive tabs ✅ BUILT (migration + cron pending)

- [x] Migration `0031_job_expiry.sql`: `job_listings.closes_at`; `expired` added to `client_job_matches.status` CHECK; indexes.
- [x] Adapters capture deadlines: JSearch `job_offer_expiration_datetime_utc` + USAJOBS `ApplicationCloseDate` → `closes_at` (ingest persists it automatically).
- [x] `expired` in the `MatchStatus` type + `status.ts` label (system-set; NOT in the client dropdown/tracker).
- [x] `GET /api/cron/expire-matches`: for active clients, flips new/saved/interested → `expired` when `closes_at` passed OR (no deadline) `date_posted` older than `EXPIRE_AFTER_DAYS` (default 45). Status filtered in TS; chunked updates; `expire_matches_run` log; idempotent.
- [x] Inactive tabs: admin `?tab=inactive` + client `?view=inactive` (both split active vs expired in TS).

### Verification
- [x] `tsc` clean, lint clean, **full `next build` passed** (`/api/cron/expire-matches` + both watchlist pages compiled).
- [x] Expire logic unit-verified (deadline precedence, 45-day age fallback, garbage-date handling).
- [x] Docs (database-schema, developer-architecture, integrations, environment-variables, rachel-admin-guide) + help regenerated.
- [ ] **BLOCKED on owner:** apply `supabase/migrations/0031_job_expiry.sql`; register the `expire-matches` cron (daily) on cron-job.org with the `Authorization: Bearer $CRON_SECRET` header. Optional: set `EXPIRE_AFTER_DAYS`.
- [ ] After migration: smoke via `/api/cron/expire-matches?now=<ISO>` (dev) — seed a past `closes_at` and confirm the match flips to `expired` + shows under Inactive.

### Files added/touched
- Added: `supabase/migrations/0031_job_expiry.sql`, `src/app/api/cron/expire-matches/route.ts`
- Edited: `src/types/database.ts`, `src/lib/job-api/{types,jsearch,usajobs}.ts`, `src/lib/matching/status.ts`, `src/app/(dashboard)/dashboard/watchlist/page.tsx`, `src/app/(admin)/admin/watchlists/[clientId]/page.tsx`, `docs/{database-schema,developer-architecture,integrations,environment-variables,rachel-admin-guide}.md` + generated help
