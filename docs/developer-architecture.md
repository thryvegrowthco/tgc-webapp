# Developer Architecture — Thryve Growth Co.

Technical reference for developers and future Claude Code sessions. For admin workflows, see `docs/rachel-admin-guide.md`.

---

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 (config via `@theme {}` in `globals.css`, not `tailwind.config.ts`) |
| UI Primitives | shadcn/ui (Radix UI) | — |
| Database + Auth + Storage | Supabase | — |
| Payments | Stripe | — |
| Transactional Email | Resend | — |
| CRM | GoHighLevel | — |
| Job Search | JSearch via RapidAPI | — |
| Rich Text Editor | Tiptap | v3.22.x |
| Analytics | Vercel Analytics | — |
| Deployment | Vercel | — |

**Critical Next.js 16 breaking changes:**
- `params` and `searchParams` in page/layout components are **Promises**, not plain objects. Always `await` them: `const { id } = await params`
- `middleware.ts` is deprecated — the file is now named `proxy.ts` and the exported function is `proxy()` (not `middleware()`). See `src/proxy.ts`.
- Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`

---

## Project Structure (Key Paths)

```
src/
├── app/
│   ├── (admin)/admin/          ← Admin pages (role-gated per page)
│   ├── (dashboard)/dashboard/  ← Client pages (session-gated)
│   ├── (auth)/                 ← Login, signup, reset-password (no Header/Footer; bare layout)
│   ├── (marketing)/            ← All public-facing pages (homepage, about, blog, services, etc.)
│   │                             Has its own layout.tsx with <Header /> and <Footer />
│   ├── actions/                ← Server actions (auth, booking, blog, documents, watchlist)
│   ├── api/                    ← Route handlers (booking slots, download, stripe webhook, cron)
│   └── auth/                   ← /auth/callback route handler (not a UI page)
├── components/
│   ├── admin/                  ← Admin-only components
│   ├── booking/                ← BookingFlow, BookingCalendar, TimeSlotPicker, BookingForm
│   ├── dashboard/              ← Client dashboard components
│   ├── layout/                 ← Header, Footer, MobileNav (used only in (marketing) layout)
│   ├── marketing/              ← Public page sections
│   ├── shared/                 ← Shared (Logo, RachelPhoto, SectionCTA, NewsletterForm, etc.)
│   └── ui/                     ← shadcn/ui design system primitives
├── lib/
│   ├── supabase/               ← client.ts, server.ts, service.ts, middleware.ts
│   ├── stripe/                 ← client.ts (lazy Proxy), products.ts (all price IDs)
│   ├── email/                  ← resend.ts (lazy Proxy + email send functions)
│   ├── gohighlevel/            ← client.ts (contact sync)
│   └── job-api/                ← jsearch.ts (search + normalize)
├── proxy.ts                    ← Route protection (renamed from middleware.ts)
└── types/
    └── database.ts             ← Hand-written Supabase types
```

---

## Route Structure and Auth

**Route groups:**

| Group | Path prefix | Layout | Access control |
|---|---|---|---|
| `(admin)` | `/admin/*` | `AdminNav` sidebar; no public Header/Footer | Each page checks `profiles.role = 'admin'` via Supabase session |
| `(dashboard)` | `/dashboard/*` | `DashboardNav` sidebar; no public Header/Footer | Each layout/page checks `supabase.auth.getUser()` |
| `(auth)` | `/login`, `/signup`, `/reset-password` | Bare (no Header/Footer) | Public; `proxy.ts` redirects authenticated users to `/dashboard` |
| `(marketing)` | `/`, `/about`, `/services`, `/blog`, `/book`, `/consultation`, `/contact`, `/faq`, `/investment`, `/packages`, `/privacy`, `/resources`, `/testimonials`, `/terms` | `Header` + `Footer` from `(marketing)/layout.tsx` | Public |

**Dashboard pages:** `/dashboard` (overview), `/dashboard/bookings`, `/dashboard/documents`, `/dashboard/watchlist` (browsable matches), `/dashboard/watchlist/setup` (preferences wizard), `/dashboard/applications` (post-application tracker for matches with status `applied`/`interviewing`/`offer`/`not_a_fit`), `/dashboard/billing` (Stripe Customer Portal handoff), `/dashboard/profile`.

**Admin pages:** `/admin` (overview), `/admin/leads` (+ `/admin/leads/[id]`), `/admin/bookings`, `/admin/clients` (+ `/admin/clients/[id]`), `/admin/content` (blog), `/admin/watchlists` (+ `/admin/watchlists/[clientId]`), `/admin/analytics`.

**Key architectural rule:** `Header` and `Footer` from `src/components/layout/` are rendered **only** inside `src/app/(marketing)/layout.tsx`. They do not appear in dashboard, admin, or auth pages. The root `layout.tsx` is a bare HTML shell (fonts, metadata, `<Toaster />`, `<Analytics />`).

**Toast notifications:** `sonner` (`<Toaster />`) is placed in the root layout body so it is available across all route groups (admin, dashboard, and marketing). Import `toast` from `"sonner"` in any client component to call `toast.success(...)` or `toast.error(...)`.

**Proxy (`src/proxy.ts`):**
- Redirects unauthenticated users hitting `/dashboard/*` or `/admin/*` to `/login?redirect=...`
- Redirects authenticated users hitting auth pages to `/dashboard`
- Does NOT check admin role (that's done per-page to avoid extra DB calls on every request for all routes)

**Per-page admin check pattern** (used in every admin page and server action):
```typescript
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
const p = profile as { role: string } | null;
if (p?.role !== "admin") redirect("/dashboard");
```

The `requireAdmin()` helper in `src/app/actions/blog.ts` and `src/app/actions/watchlist.ts` encapsulates this pattern for server actions.

---

## Supabase Client Patterns

Three client factories — use the right one for each context:

| Client | File | When to use |
|---|---|---|
| Browser client | `src/lib/supabase/client.ts` | Client components that need Supabase directly |
| Server client | `src/lib/supabase/server.ts` `createClient()` | Server components, server actions, route handlers (user-facing) |
| Service client | `src/lib/supabase/service.ts` `createServiceClient()` | Stripe webhook, admin server actions — **bypasses RLS entirely** |

**Never use the service client in client components or anywhere the caller isn't already verified as admin/internal.**

**TypeScript types (`src/types/database.ts`):**
- Hand-written (not auto-generated from Supabase CLI)
- Every table definition requires `Relationships: []` — without it, supabase-js v2 resolves query result types to `never`
- Avoid `.eq()` on union-literal columns (e.g., `role`, `status`) in typed queries — the type narrows to `never`. Pattern: cast result with `as LocalType[]` and filter in TypeScript if needed, or use `as any` + local type annotation

---

## Server Actions (`src/app/actions/`)

All actions are `"use server"` files. They redirect on failure to auth routes when the user isn't logged in.

| File | Functions | Notes |
|---|---|---|
| `auth.ts` | `signUp`, `logIn`, `logOut`, `requestPasswordReset`, `updatePassword` | — |
| `booking.ts` | `createBookingCheckoutSession`, `addBulkAvailabilitySlots`, `deleteAvailabilitySlot`, `updateBookingStatus` | `createBookingCheckoutSession` refuses if slot is already booked; `addBulkAvailabilitySlots` accepts `{ dates, timeBlocks, serviceType }` and inserts the cartesian product via Supabase upsert with `ignoreDuplicates` against the `(slot_date, start_time)` unique index — returns `{ created, skipped }`. 500-row sanity cap. `deleteAvailabilitySlot` refuses if slot is booked; `updateBookingStatus` is admin-only with status allowlist |
| `documents.ts` | `uploadDocument`, `deleteDocument`, `addClientNote` | Uses service client; cleans up Storage on DB insert failure |
| `blog.ts` | `createBlogPost`, `updateBlogPost`, `deleteBlogPost`, `uploadFeaturedImage` | `requireAdmin()` guard; slug uniqueness enforced in both create + update |
| `watchlist.ts` | `saveWatchlistProfile`, `updateMatchStatus`, `addManualJob`, `assignJobToClient`, `toggleRachelRecommended`, `removeJobMatch`, `fetchJSearchJobsForClient`, `runAutoMatchForClient` | Client actions + admin actions mixed in one file; each has its own auth check. `fetchJSearchJobsForClient` and `runAutoMatchForClient` apply the scoring engine in `src/lib/matching/score.ts` and only insert matches with score ≥ 60. |
| `billing.ts` | `createPortalSession` | Looks up client's `stripe_subscription_id`, retrieves Stripe customer ID from the subscription, creates a Stripe Customer Portal session, and redirects. Used by `/dashboard/billing`. |
| `leads.ts` | `updateLeadStatus`, `updateLeadAdminNotes` | Admin-only. Used on `/admin/leads/[id]`. |
| `newsletter.ts` | `createIssue`, `updateIssue`, `submitForApproval`, `approveAndSchedule`, `approveAndSendNow`, `unscheduleIssue`, `duplicateIssue`, `deleteIssue`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `manuallyUnsubscribe`, `saveIdea`, `deleteIdea` | Admin-only via `requireAdmin()`. Approval workflow enforces `scheduled_for` is at least 5 minutes in the future. `approveAndSendNow` calls `sendIssue` synchronously and returns sent/failed counts. |

---

## Stripe Integration

**Service/price config:** `src/lib/stripe/products.ts`
- `SERVICES` record maps `ServiceKey` → price ID + amount + mode
- `BOOKABLE_SERVICES` array determines which services require slot selection (coaching + interview prep only)
- All price IDs read from env vars at runtime; fallback strings used in development
- **To add a new service:** Add a `ServiceKey`, add to `SERVICES`, add to `SERVICE_SELECT_OPTIONS`, add the env var

**Lazy Proxy singleton (`src/lib/stripe/client.ts`):**
Stripe client is wrapped in a `Proxy` to defer initialization until first access. This prevents build failures when `STRIPE_SECRET_KEY` is not set during `next build`.

**Checkout flow:**
1. `createBookingCheckoutSession` builds a Stripe Checkout session with all booking metadata embedded in `session.metadata`
2. Client is redirected to Stripe; on success redirected to `/book/success?session_id=...`
3. Stripe POSTs `checkout.session.completed` to `/api/webhooks/stripe`

**Webhook (`src/app/api/webhooks/stripe/route.ts`):**
- Validates signature with `stripe.webhooks.constructEvent`
- Two handlers: `handleCheckoutCompleted` (mode: `payment`) and `handleSubscriptionCheckoutCompleted` (mode: `subscription`)
- Uses service client (bypasses RLS)
- All side effects (email, GHL sync) run in `Promise.allSettled` — failures do not block the 200 response
- Handles `checkout.session.completed`, `customer.subscription.deleted` (sets `subscription_status = 'cancelled'`), and `customer.subscription.updated` (maps Stripe status to `'active'`/`'inactive'`/`'cancelled'`)

---

## Blog System

- Content stored as JSONB in `blog_posts.content` (Tiptap ProseMirror JSON format)
- **Editor:** `src/components/admin/RichTextEditor.tsx` — Tiptap with StarterKit (headings 2/3/4, no codeBlock), Link, Image, Placeholder, CharacterCount extensions
- **Renderer:** `src/app/blog/[slug]/page.tsx` uses `generateHTML` from `@tiptap/html` with matching extension set
- Extension sets must match between editor and renderer — mismatches cause empty output or errors
- `published_at` is set once (first publish) and preserved on all subsequent updates — see `updateBlogPost`
- Slug uniqueness enforced with a separate query before insert/update (not a DB constraint, to allow friendly error messages)
- **Featured images:** uploaded to private `documents` bucket under `blog/{timestamp}-{filename}`, served via `getPublicUrl()`. This works despite the bucket being private because Supabase's `getPublicUrl` generates a public-facing URL. Intentional for blog images; client documents use signed URLs instead.

---

## Documents and Storage

- Single Supabase Storage bucket: `documents` (private, 25 MB limit)
- Client documents stored at: `{clientId}/{timestamp}-{safeFilename}`
- Blog images stored at: `blog/{timestamp}-{filename}`
- Accepted MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/plain`, `image/jpeg`, `image/png`
- **Download flow:** `GET /api/documents/download?path=...&name=...` validates the user owns the document (or is admin), then generates a 60-minute signed URL and redirects to it
- Upload uses service client in `uploadDocument` — bypasses storage RLS since admin is already verified in the action

---

## Public API Routes

Lightweight route handlers for marketing-page forms. Both accept JSON POST, return `{ ok: true }` on success and `{ ok: false, error }` on validation/server errors.

| Route | Triggered by | What it does |
|---|---|---|
| `POST /api/newsletter` | Footer + blog + `/newsletter` landing form | Validates email, sanitizes interests against the 7-slug enum, upserts into `newsletter_subscribers` (merges interests on existing email, clears `unsubscribed_at` on resubscribe), calls `syncNewsletterSubscriber` for GHL, and sends the welcome email (idempotent via `welcome_sent_at`). Body: `{ email, firstName?, source?, interests? }`. |
| `GET / POST /api/newsletter/unsubscribe/[token]` | `List-Unsubscribe` header in every newsletter email | Marks subscriber `unsubscribed_at = NOW()` and logs an `unsubscribed` event. POST returns 200 for Gmail one-click (RFC 8058); GET redirects to `/newsletter/unsubscribe/[token]` for the pretty confirmation page. |
| `POST /api/newsletter/manage/[token]` | `/newsletter/manage/[token]` page | Updates subscriber interests; if `resubscribe: true`, clears `unsubscribed_at`. Token is the only auth. |
| `POST /api/newsletter/feedback` | Unsubscribe confirmation page feedback textarea | Sends Rachel a plain-text email with the subscriber's reason. Fire-and-forget. |
| `POST /api/contact` | `/contact` page `ContactForm` | Validates all 5 fields, calls `sendContactFormSubmission` (Resend) with `replyTo` set to the submitter's email so Rachel can reply directly. Body: `{ firstName, lastName, email, subject, message }`. |
| `POST /api/leads` | `/services/job-alerts` page `JobWatchlistLeadForm` | Validates input, inserts a row into `leads` via service client, fires two best-effort emails (admin notification to `hello@thryvegrowth.co`, thank-you to the lead). Body: `{ fullName, email, phone?, currentRole?, targetRole?, location?, remotePreference?, timeline?, notes? }`. |
| `POST /api/consultation` | `/consultation` page `ConsultationForm` (`src/components/marketing/ConsultationForm.tsx`) | Validates required fields + timing whitelist, sends admin alert via `sendConsultationRequest` (Resend, `replyTo` = submitter). Best-effort: client auto-reply via `sendConsultationRequestAutoReply`, GHL sync via `syncContactToGHL` with tags `["thryve-lead", "consultation-requested"]`. Body: `{ firstName, lastName, email, phone?, timing?, message }`. |

Both routes run server-side only; no auth required (public forms). The service client is used for `/api/newsletter` because `newsletter_subscribers` has an anon-insert RLS policy, but service client avoids any RLS surprises.

---

## Cron Jobs

All cron endpoints share the same auth pattern (`Authorization: Bearer {CRON_SECRET}`, `isAuthorized()` allows all when the env var is unset for local testing). Schedules live in cron-job.org; see `docs/integrations.md` → "cron-job.org" for the inventory and per-job setup steps.

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/job-alerts` | `0 9 * * 1` (Mon 9 AM UTC) | Weekly job match digest per active watchlist subscriber. |
| `/api/cron/newsletter-send` | `0 * * * *` (hourly) | Fetches `newsletter_issues` where `status='scheduled' AND scheduled_for <= NOW()` and calls `sendIssue` for each. Hourly precision means a 9:15 AM schedule sends at 10 AM. |
| `/api/cron/newsletter-reengage` | `0 14 * * 3` (Wed 9 AM Central) | Sends "we missed you" to subscribers inactive 60+ days (capped 50/run). |
| `/api/cron/newsletter-milestones` | `0 14 * * *` (daily) | Sends thank-you emails on the 6-month and 1-year anniversary of signup. |

---

## Resend Webhook

**File:** `src/app/api/webhooks/resend/route.ts`

- **Auth:** Svix HMAC-SHA256 signature verification using `RESEND_WEBHOOK_SECRET`. Signed payload format: `${svix-id}.${svix-timestamp}.${body}`. Done manually (no `svix` dep) to keep the bundle small.
- **Events handled:** `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Maps them to the matching `newsletter_events.event_type` values.
- **Correlation:** Looks up `newsletter_sends` by `resend_message_id` (= Resend's `data.email_id`) to recover the `issue_id` + `subscriber_id` for the event row.
- **Idempotency:** `UNIQUE(resend_event_id)` constraint on `newsletter_events` makes the handler safe under retries. Duplicate-key errors (`23505`) are swallowed.
- **Side effects:** opens/clicks update `subscribers.last_engaged_at`; bounces/complaints set `unsubscribed_at`.

---

## Newsletter System

**Server libraries:**
- `src/lib/newsletter/interests.ts` — 7-slug enum, `sanitizeInterests()` validator, `labelForInterest()` lookup.
- `src/lib/newsletter/extensions.ts` — shared Tiptap extension arrays (`newsletterEditorExtensions` for the editor, `newsletterRenderExtensions` for the server-side renderer). Must stay in sync — the renderer is a subset of the editor.
- `src/lib/email/newsletter-template.ts` — `renderNewsletterShell()` brand HTML wrapper (inline styles, system-font stack, one mobile media query).
- `src/lib/email/newsletter-render.ts` — `renderIssueHTML()`, `renderIssueText()`, `buildUnsubscribeUrl()`, `buildUnsubscribeApiUrl()`, `buildManageUrl()`.
- `src/lib/email/newsletter-welcome.ts` — `sendWelcomeEmail()` warm intro email.
- `src/lib/email/newsletter-reengagement.ts` — `sendReengagementEmail()`, `sendMilestoneEmail()`.
- `src/lib/email/newsletter-send.ts` — `sendIssue(issueId)` send pipeline: locks issue, renders once, batches recipients to 100/req, calls `resend.batch.send`, writes `newsletter_sends`, throttles 1.1s between batches, updates `last_sent_at` on each delivered subscriber.

**Components:**
- `src/components/admin/NewsletterEditor.tsx` — Tiptap editor (shared extensions).
- `src/components/admin/NewsletterIssueForm.tsx` — full composer (title/subject/preheader/body/audience/featured blog/schedule/actions).
- `src/components/admin/NewsletterTemplateForm.tsx` — template CRUD form.
- `src/components/admin/IdeaInbox.tsx` — quick-capture idea inbox on the dashboard.
- `src/components/admin/DeleteIssueButton.tsx`, `ManualUnsubscribeButton.tsx` — small client-action buttons.
- `src/components/marketing/UnsubscribeForm.tsx`, `ManagePreferencesForm.tsx` — public token-authenticated forms.

**Admin pages** (`src/app/(admin)/admin/newsletter/`):
- `page.tsx` — dashboard with subscriber stats, scheduled list, recently sent open/click rates, idea inbox.
- `subscribers/page.tsx` — filterable table by interest + status with manual unsubscribe.
- `issues/page.tsx` — list grouped by status (Drafts / Scheduled / Sent).
- `issues/new/page.tsx` — composer pre-filled from the default template.
- `issues/[id]/page.tsx` — composer with engagement stats when sent.
- `issues/[id]/preview/page.tsx` — iframe preview using `/api/admin/newsletter/preview/[id]`.
- `templates/page.tsx`, `templates/new/page.tsx`, `templates/[id]/page.tsx` — template CRUD.

**Marketing pages** (`src/app/(marketing)/newsletter/`):
- `page.tsx` — landing page with `<NewsletterForm variant="full">`.
- `unsubscribe/[token]/page.tsx` — pretty confirmation with feedback form.
- `manage/[token]/page.tsx` — interest editor + resubscribe.

---

## JSearch / Job API

**File:** `src/lib/job-api/jsearch.ts`

- `searchJobs(params)` — calls RapidAPI JSearch endpoint; returns empty array if `RAPIDAPI_KEY` missing
- `normalizeJob(job)` — maps raw JSearch response to `job_listings` table shape; truncates description to 2000 chars
- Responses cached 1 hour via Next.js `fetch` cache: `next: { revalidate: 3600 }`
- Deduplication in `fetchJSearchJobsForClient`: existing `external_id` values are queried before insert

---

## Auto-matching engine

**File:** `src/lib/matching/score.ts` (pure, no side effects)

`scoreJobAgainstProfile(profile, job)` returns `{ score: 0–100, label, reasons[] }`. Weights:

| Signal | Max pts | How it scores |
|---|---|---|
| Role keyword overlap | 40 | tokens from `target_roles` matched against job title (worth more) and description |
| Location / remote fit | 25 | full credit when remote-pref matches `is_remote`, or location string overlaps |
| Salary band overlap | 15 | parses `job.salary_range` (e.g., `$80k–$100k`) and compares against `salary_min`/`salary_max` |
| Experience level | 15 | matches level keywords (senior/lead/principal, mid, junior/entry) in title + description |
| Industry mention | 5 | substring match between profile `industries[]` and job company/description |

Threshold: `score ≥ 60` is included. Tier labels: `80+` → `strong`, `65–79` → `good`, `60–64` → `maybe`. The label is stored in `client_job_matches.score_label`.

**Used by:**
- `fetchJSearchJobsForClient` — scores every fetched job before assigning to the client; only inserts matches above threshold; flags `strong` matches as `rachel_recommended`
- `runAutoMatchForClient` — admin-triggered (button on `/admin/watchlists/[clientId]`); walks every active job from the last 60 days, scores against the client's profile, inserts new matches above threshold (skips already-assigned jobs)

**UI:** the score and label render as a badge on both the admin watchlist match list and the client `/dashboard/watchlist` page.

---

## GoHighLevel

**File:** `src/lib/gohighlevel/client.ts`

- Base URL: `https://rest.gohighlevel.com/v1`
- Endpoint: `/contacts/upsert`
- Sync triggers: booking checkout completion (`syncBookingToGHL`), newsletter subscribe (`syncNewsletterSubscriber`)
- Tags applied: `thryve-client` on all; `booked` on booking sync; `thryve-newsletter` on newsletter sync
- **Silently skips** (with a console warning) if `GHL_API_KEY` or `GHL_LOCATION_ID` are not set — bookings and newsletter signups still work

---

## Admin Email Configuration

The `handle_new_user()` trigger (migration `0003_admin_email.sql`) reads a Postgres database setting to auto-assign `role = 'admin'` on signup. Set it once in the Supabase SQL editor:

```sql
ALTER DATABASE postgres SET app.admin_email = 'rachel@thryvegrowth.co';
```

- If not set, all signups default to `role = 'client'`
- Persists across sessions — set once, works forever
- Existing users are not affected; update them with `UPDATE profiles SET role = 'admin' WHERE email = '...'`

---

## UI Component Patterns

**Reusable UI components in `src/components/ui/`:**

| Component | File | Purpose |
|---|---|---|
| `Breadcrumb` | `breadcrumb.tsx` | Navigation breadcrumbs for detail/nested pages. Props: `items: Array<{ label: string; href?: string }>`. Last item is non-linked (current page). |
| `ConfirmDialog` | `confirm-dialog.tsx` | Accessible confirmation dialog for destructive actions. Built on `@radix-ui/react-dialog`. Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel` (default: "Delete"), `confirmVariant`, `onConfirm`, `loading`. |
| `EmptyState` | `empty-state.tsx` | Standardized empty state for tables and lists. Props: `icon?`, `title`, `description?`, `action?`. |
| `PageSkeleton` | `page-skeleton.tsx` | Shared loading skeleton for `loading.tsx` files. Used in all dashboard and admin route segments. |

**Filter state pattern (for future filter UI):** Use URL `searchParams` (server component readable) rather than `useState`. A "Clear filters" button is a `<Link href="/admin/clients">` that resets all params. This keeps filter state shareable and bookmarkable without client-side state.

---

## Known Gaps

1. **No role management UI** — `profiles.role` can only be changed via the Supabase dashboard or SQL. There is no admin panel control.
