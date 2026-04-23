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
| `(marketing)` | `/`, `/about`, `/services`, `/blog`, `/book`, `/contact`, `/faq`, `/investment`, `/packages`, `/privacy`, `/testimonials`, `/terms` | `Header` + `Footer` from `(marketing)/layout.tsx` | Public |

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
| `booking.ts` | `createBookingCheckoutSession`, `addAvailabilitySlot`, `deleteAvailabilitySlot`, `updateBookingStatus` | `createBookingCheckoutSession` refuses if slot is already booked; `deleteAvailabilitySlot` refuses if slot is booked; `updateBookingStatus` is admin-only with status allowlist |
| `documents.ts` | `uploadDocument`, `deleteDocument`, `addClientNote` | Uses service client; cleans up Storage on DB insert failure |
| `blog.ts` | `createBlogPost`, `updateBlogPost`, `deleteBlogPost`, `uploadFeaturedImage` | `requireAdmin()` guard; slug uniqueness enforced in both create + update |
| `watchlist.ts` | `saveWatchlistProfile`, `updateMatchStatus`, `addManualJob`, `assignJobToClient`, `toggleRachelRecommended`, `removeJobMatch`, `fetchJSearchJobsForClient` | Client actions + admin actions mixed in one file; each has its own auth check |

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
| `POST /api/newsletter` | Footer form + blog-page `NewsletterForm` | Validates email, inserts into `newsletter_subscribers` (via service client), calls `syncNewsletterSubscriber` for GHL. Duplicate email (Postgres `23505`) returns success. Body: `{ email, firstName?, source? }`. |
| `POST /api/contact` | `/contact` page `ContactForm` | Validates all 5 fields, calls `sendContactFormSubmission` (Resend) with `replyTo` set to the submitter's email so Rachel can reply directly. Body: `{ firstName, lastName, email, subject, message }`. |

Both routes run server-side only; no auth required (public forms). The service client is used for `/api/newsletter` because `newsletter_subscribers` has an anon-insert RLS policy, but service client avoids any RLS surprises.

---

## Cron Job

**File:** `src/app/api/cron/job-alerts/route.ts`

- **Schedule:** Every Monday at 9:00 AM UTC (`0 9 * * 1` in `vercel.json`)
- **Auth:** `Authorization: Bearer {CRON_SECRET}` header (sent automatically by Vercel Cron)
- **Logic:** Fetches all `watchlist_profiles` with `subscription_status = 'active'` → for each, finds `client_job_matches` created in the last 7 days with `status = 'new'` → fetches job details → builds plain-text email digest → sends via Resend
- Skips subscribers with 0 new matches — they don't receive an email that week
- Logs sent count and any errors to server logs

---

## JSearch / Job API

**File:** `src/lib/job-api/jsearch.ts`

- `searchJobs(params)` — calls RapidAPI JSearch endpoint; returns empty array if `RAPIDAPI_KEY` missing
- `normalizeJob(job)` — maps raw JSearch response to `job_listings` table shape; truncates description to 2000 chars
- Responses cached 1 hour via Next.js `fetch` cache: `next: { revalidate: 3600 }`
- Deduplication in `fetchJSearchJobsForClient`: existing `external_id` values are queried before insert

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
