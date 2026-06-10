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
│   ├── ai/                     ← prompts.ts ("Draft with ChatGPT" prompt builders + parser; no API)
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
| `(booking)` | `/book-session/[token]`, `/book-session/[token]/confirmed` | Minimal branded shell (`(booking)/layout.tsx`); no Header/Footer | **Public, token-gated** — the public booking page for invitations. Reads/writes via the service client (the URL token is the bearer secret); not covered by `proxy.ts` auth |
| `(proposals)` | `/proposal/[token]`, `/proposal/[token]/accepted` | Minimal branded shell (`(proposals)/layout.tsx`, mirrors the booking group); no Header/Footer | **Public, token-gated** — the public proposal review/accept page. Reads/writes via the service client (the URL token is the bearer secret); not covered by `proxy.ts` auth |
| `(testimonial)` | `/testimonial/[token]`, `/testimonial/[token]/thanks` | Minimal branded shell (`(testimonial)/layout.tsx`, mirrors the proposals group); no Header/Footer; `robots` noindex | **Public, token-gated** (Phase 3) — the per-booking testimonial submit page. Resolves the booking by `bookings.testimonial_token` via the service client; not covered by `proxy.ts` auth |
| `(marketing)` | `/`, `/about`, `/services`, `/blog`, `/book`, `/consultation`, `/contact`, `/faq`, `/investment`, `/packages`, `/privacy`, `/resources`, `/testimonials`, `/terms` | `Header` + `Footer` from `(marketing)/layout.tsx` | Public |

**Dashboard pages:** `/dashboard` (overview), `/dashboard/bookings`, `/dashboard/documents`, `/dashboard/progress` (Phase 3 — `GoalsManager` over the client's own `client_goals` + a read-only timeline of the client's bookings that have a `session_summary`/`next_steps`, reverse-chronological), `/dashboard/watchlist` (browsable matches), `/dashboard/watchlist/setup` (preferences wizard), `/dashboard/applications` (post-application tracker for matches with status `applied`/`interviewing`/`offer`/`not_a_fit`), `/dashboard/billing` (Stripe Customer Portal handoff), `/dashboard/profile`. The "Progress" nav item sits after "My Packages" in `DashboardNav` (`src/components/dashboard/DashboardNav.tsx`).

**Admin pages:** `/admin` (overview, now with a "Top tasks" widget above Recent Bookings), `/admin/tasks` (filter by upcoming/overdue/completed), `/admin/notifications` (full inbox), `/admin/leads` (+ `/admin/leads/[id]`, with a "Create proposal" button → `/admin/proposals/new?leadId=` and a list of that lead's proposals), `/admin/proposals` (list) (+ `/admin/proposals/new` accepting `?leadId=` / `?clientId=`, and `/admin/proposals/[id]` — edit, locked once accepted/paid/declined), `/admin/sessions` (session queue with status filter + client/service search), `/admin/invitations` (+ `/admin/invitations/new?clientId=` — booking-invitation builder; `BookingInvitationForm` adapts the `BulkSlotForm` date/time pattern), `/admin/bookings`, `/admin/clients` (+ `/admin/clients/[id]`, with per-client Tasks panel, a "Create booking invitation" button, a "Proposals" panel with a "+ New proposal" link → `/admin/proposals/new?clientId=`, and a Phase 3 "Goals" panel — `client_goals` added to the page's parallel `Promise.all`, rendered via `GoalsManager` in `adminMode`), `/admin/content` (blog), `/admin/resources` (+ `/admin/resources/[id]` — toggles + edit form for the `/resources` catalog), `/admin/testimonials` (Phase 3 — moderation queue with all statuses grouped pending → approved → hidden + counts; + `/admin/testimonials/[id]` edit and `/admin/testimonials/new` manual add), `/admin/watchlists` (+ `/admin/watchlists/[clientId]`), `/admin/analytics`. The "Proposals" nav item sits between Invitations and Bookings, and the "Testimonials" item sits after Resources, in `AdminNav` (`src/components/admin/AdminNav.tsx`).

**Proposal components (Phase 2):** `src/components/admin/ProposalForm.tsx` (builder — reuses `RichTextEditor` for scope/terms; optional line items; total amount; `requires_signature` toggle; expiry; save-draft vs send), `src/components/admin/ProposalRowActions.tsx` (copy link / edit / send / cancel). Public: `src/components/proposals/ProposalContent.tsx` (server renderer — Tiptap extensions match `RichTextEditor`, incl. Image) and `src/components/proposals/ProposalAcceptClient.tsx` (signature input + accept/pay + decline).

**Booking-invitation components:** `src/components/admin/BookingInvitationForm.tsx` (builder), `src/components/admin/InvitationRowActions.tsx` (copy-link / resend / cancel), `src/components/admin/SessionsFilters.tsx` (status + search bar), `src/components/booking/InvitationSlotSelector.tsx` (public radio slot picker).

**Testimonial + goals components (Phase 3):** Public submit — `src/components/testimonial/TestimonialForm.tsx` (quote, editable author name, optional title, 1–5 star control) inside `src/app/(testimonial)/testimonial/[token]/page.tsx` (service client resolves the booking by `testimonial_token`, prefills the name from the profile, renders a `ClosedState` when the link is unknown / already submitted) → `.../thanks/page.tsx`. Admin moderation — `src/components/admin/TestimonialStatusControl.tsx` (approve / hide / unhide / delete + edit link) and `src/components/admin/TestimonialEditForm.tsx` (used by `/admin/testimonials/[id]` and `/admin/testimonials/new`). Public display — `src/app/(marketing)/testimonials/page.tsx` is a server component reading approved rows via RLS (no `.eq("status")` — a defensive JS filter keeps it to `approved`; graceful empty state; starts empty + `robots` noindex). Goals — `src/components/dashboard/GoalsManager.tsx` (add / edit / complete / delete + status select), shared by `/dashboard/progress` (client self-serve) and the `/admin/clients/[id]` Goals panel (`adminMode`).

**Session-management components (Phase 2):** `src/components/admin/UpcomingSessionsWidget.tsx` (admin overview, self-fetching server component for today + next 7 days) + `src/components/admin/SessionQuickActions.tsx` (remind / mark-complete); `src/components/admin/SessionRecordEditor.tsx` (per-booking editor on the client detail page: status incl. no-show, payment, summary, next steps, follow-up flag, reschedule, send reminder, cancel). Calendar helpers `updateCalendarEvent` / `deleteCalendarEvent` added to `src/lib/google/calendar.ts`.

**Admin layout top bar:** `src/app/(admin)/admin/layout.tsx` renders a thin header above `<main>` that hosts the `NotificationBell` (`src/components/admin/NotificationBell.tsx`). The bell polls every 60s via `router.refresh()` to keep the unread count + dropdown fresh without Supabase Realtime.

**Key architectural rule:** `Header` and `Footer` from `src/components/layout/` are rendered **only** inside `src/app/(marketing)/layout.tsx`. They do not appear in dashboard, admin, or auth pages. The root `layout.tsx` is a bare HTML shell (fonts, metadata, `<Toaster />`, `<Analytics />`, `<TrackingPixels />`, `<CookieConsent />`).

**Visitor tracking triad** (`src/components/tracking/`):
- `TrackingPixels.tsx` — async server component; queries `tracking_pixels WHERE enabled = TRUE AND pixel_id IS NOT NULL` via the anon-RLS-gated client. Fails open with no scripts if the table is missing or Supabase is unreachable, so a tracking outage never breaks the root layout.
- `TrackingScripts.tsx` — `"use client"`; reads `cookie_consent` from `localStorage` on mount, listens for the `thryve:consent-change` custom event, and renders the per-provider `<Script>` tags via `buildScripts()` from `src/lib/tracking/scripts.ts` **only when consent === "accepted"`.
- `CookieConsent.tsx` — `"use client"`; bottom-left banner shown when no decision is recorded. Accept / Reject both write to `localStorage` and dispatch `thryve:consent-change` so `TrackingScripts` re-renders without a reload. Hydration-safe via a `mounted` flag.

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

Shared admin guard: `src/lib/auth/require.ts` exports `requireAdmin()` (non-throwing — returns `{ ok, userId } | { ok: false, error }`) and `requireAdminOrThrow()` (throws "Unauthorized"). Use the non-throwing form for actions whose return type is `{ error?, success? }`. Older inline `requireAdmin()` helpers in `blog.ts`, `watchlist.ts`, and `availability.ts` predate the shared lib and may be consolidated in a follow-up.

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
| `booking.ts` | `createBookingCheckoutSession`, `addBulkAvailabilitySlots`, `deleteAvailabilitySlot`, `deleteAvailabilitySlotsBulk`, `updateBookingStatus`, `updateSession` | `createBookingCheckoutSession` refuses if slot is already booked; `addBulkAvailabilitySlots` accepts `{ dates, timeBlocks, serviceType }` and inserts the cartesian product via Supabase upsert with `ignoreDuplicates` against the `(slot_date, start_time)` unique index — returns `{ created, skipped }`. 500-row sanity cap. `deleteAvailabilitySlot` refuses if slot is booked. `deleteAvailabilitySlotsBulk(ids: string[])` mirrors the single-row guard with `.in("id", ids).eq("is_booked", false)` — booked rows are filtered out of the delete and surfaced via the `skipped` count. `updateBookingStatus` is admin-only with status allowlist. `updateSession(bookingId, fields)` is admin-only and edits a session record: `workflow_status` (incl. `no_show`/`rescheduled`, stamps `completed_at` on `completed`), `payment_status`, `admin_notes`, `session_summary`, `next_steps`, `follow_up_needed`; stamps `updated_at`. |
| `booking-invitations.ts` | Admin: `createBookingInvitation`, `sendBookingInvitation`, `cancelBookingInvitation`. Public (token-gated, no auth): `acceptBookingInvitation`, `createInvitationCheckoutSession`, `releaseReservedOptions` | Admin-initiated booking flow. `createBookingInvitation` validates + computes each option's `session_at` via `localCentralToUtcIso` and inserts `booking_invitations` + `booking_invitation_options` (rolls back the parent if option insert fails); `sendNow` emails immediately. `sendBookingInvitation` sends `booking_invitation` and stamps `status='sent'`. Public actions validate the invitation by token via the service client, atomically reserve one option (`open→reserved`, stamps `reserved_at`), and either call `finalizeSession` (free) or open Stripe Checkout with `metadata.flow='invitation'` (paid). `releaseReservedOptions` is called on `cancel_url` return. |
| `packages.ts` | Client: `redeemPackageCredit({ packageId, slotId })` | Phase 1a. Validates an active, non-expired package with a remaining credit (own); atomically claims the slot (`is_booked` guard); creates the session via `createSessionBooking` (no charge, covered by the package); decrements `sessions_used` (optimistic guard); `exhausted` when full. Powers `/dashboard/packages` + `PackageRedeemClient`. |
| `sessions.ts` | Admin: `rescheduleSession`, `sendSessionReminderNow`, `cancelSession`. Client (ownership + >24h): `clientRescheduleSession`, `clientCancelSession`. | Phase 2 session management + Phase 1b self-service. The admin and client actions share `performReschedule` / `performCancel` cores; client wrappers add ownership + the 24h-notice gate (`canSelfModify`) and `notifyAdmin`. `cancelSession`/`clientCancelSession` return a package credit (`returnPackageCredit`). `rescheduleSession` recomputes `session_at`, runs an overlap guard, PATCHes the calendar event via `updateCalendarEvent` (recreates if missing), resets `session_reminder_sent_at`/`reminder_1h_sent_at`/`prep_summary_sent_at`, and re-sends `session_confirmed` (non-idempotent, `eventKey='session_rescheduled_sent'`). `sendSessionReminderNow` sends `session_reminder_1h` on demand. `cancelSession` sets `cancelled` + removes the calendar event via `deleteCalendarEvent`. Client email/name resolved from the profile or, for account-less invitation sessions, the source `booking_invitations` row. |
| `documents.ts` | `uploadDocument`, `deleteDocument`, `addClientNote` | Uses service client; cleans up Storage on DB insert failure. On categories `deliverable`/`resume_rewrite`/`hr_doc`, `uploadDocument` fires the `deliverable_ready` email to the client (idempotent via `automation_log` event_key `deliverable_ready_sent:{documentId}`). |
| `intake.ts` | `saveIntake` | Client action gated by booking ownership. On submit: sends `intake_complete` email, folds uploaded filenames into the admin alert (`sendAdminBookingAlert` accepts an `uploadedFiles` option), writes `intake_submitted` + per-file `client_doc_upload` admin notifications, and inserts a `Prepare deliverable / session` auto-task. |
| `notifications.ts` | `markNotificationRead`, `markAllNotificationsRead`, `markClientNotificationRead`, `markAllClientNotificationsRead` | Admin pair gated by `requireAdmin()`; client pair scoped to `auth.uid()` own rows. Bump `read_at` and revalidate the relevant layout for the bell. |
| `tasks.ts` | `createTask`, `updateTask`, `completeTask`, `uncompleteTask`, `deleteTask` | Admin-only via shared `requireAdmin()`. Revalidates `/admin`, `/admin/tasks`, and per-client pages. |
| `resources.ts` | `toggleResource`, `updateResource` | Admin-only via shared `requireAdmin()`. Powers `/admin/resources` toggles + edit form; both calls revalidate `/resources` so the public page reflects changes immediately. |
| `tracking-pixels.ts` | `toggleTrackingPixel`, `updateTrackingPixel` | Admin-only via shared `requireAdmin()`. Powers the Visitor Tracking cards on `/admin/integrations`. Calls `revalidatePath("/", "layout")` so every public page re-fetches the live pixel set on the next request, and bumps `/privacy` so its dynamic Cookies section stays in sync. |
| `blog.ts` | `createBlogPost`, `updateBlogPost`, `deleteBlogPost`, `uploadFeaturedImage` | `requireAdmin()` guard; slug uniqueness enforced in both create + update |
| `watchlist.ts` | Client: `saveWatchlistProfile`, `updateMatchStatus`, `toggleFavorite`, `updateMatchNotes`, `updateApplicationDetails`. Admin: `addManualJob`, `assignJobToClient(clientId, jobId, curation?)`, `toggleRachelRecommended`, `removeJobMatch`, `fetchJSearchJobsForClient`, `runAutoMatchForClient`, `updateWatchlistProfileAsAdmin`, `setWatchlistReviewStatus`, `pauseWatchlist`, `reactivateWatchlist`, `cancelWatchlist`, `toggleJobSource` | Client + admin actions in one file; each has its own auth check. Save/assign/fetch emit `client_notifications` + emails (`new_job_match`/`curated_job_match`/`watchlist_updated`). `pause/reactivate/cancel` act on the Stripe subscription + local status. `toggleJobSource` flips `job_sources.enabled`. Auto-match uses `src/lib/matching/score.ts`, inserting only matches with score ≥ 60 (excluded-employer / unmet must-have force exclusion). |
| `messages.ts` | `sendMessage`, `markThreadRead`, `uploadMessageAttachment` | Two-way client↔admin thread (`client_messages`). `sendMessage` emails the other party + writes a `message_received` client notification (admin→client). `uploadMessageAttachment` stores files in the private `documents` bucket at `messages/{clientId}/...` via the service client; download is gated by `/api/messages/attachment`. |
| `billing.ts` | `createPortalSession` | Looks up client's `stripe_subscription_id`, retrieves Stripe customer ID from the subscription, creates a Stripe Customer Portal session, and redirects. Used by `/dashboard/billing`. |
| `leads.ts` | `updateLeadStatus`, `updateLeadAdminNotes` | Admin-only. Used on `/admin/leads/[id]`. |
| `proposals.ts` | Admin: `createProposal`, `updateProposal`, `sendProposal`, `cancelProposal`. Public (token-gated, no auth): `acceptProposal`, `declineProposal` | Phase 2 quote→proposal→pay. Admin actions are `requireAdmin()`-gated. `createProposal` validates (valid email, title, amount ≥ 0; paid must be ≥ $0.50) and inserts a `proposals` row (`draft`); `sendNow` emails immediately via `sendProposal` (`proposal_sent`, stamps `sent`). `updateProposal` refuses edits once `accepted`/`paid`/`declined` (immutable record). `cancelProposal` refuses to cancel a `paid` proposal. Public actions look up by token via the service client (token = bearer secret). `acceptProposal` records the signature snapshot once (idempotent — status, `accepted_at`/`name`/`ip`, `accepted_snapshot` = copy of `content`), `notifyAdmin('proposal_accepted')`, then redirects to Stripe Checkout (ad-hoc `price_data`, `metadata.flow='proposal'`) for paid proposals or to `/proposal/[token]/accepted` for `$0`. `declineProposal` stamps `declined` + notifies Rachel. |
| `newsletter.ts` | `createIssue`, `updateIssue`, `submitForApproval`, `approveAndSchedule`, `approveAndSendNow`, `unscheduleIssue`, `duplicateIssue`, `deleteIssue`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `manuallyUnsubscribe`, `saveIdea`, `deleteIdea` | Admin-only via `requireAdmin()`. Approval workflow enforces `scheduled_for` is at least 5 minutes in the future. `approveAndSendNow` calls `sendIssue` synchronously and returns sent/failed counts. |
| `testimonials.ts` | Public (token-gated, no auth): `submitTestimonial`. Admin (`requireAdmin()`): `setTestimonialStatus`, `updateTestimonial`, `createTestimonial`, `deleteTestimonial` | Phase 3. `submitTestimonial({ token, ... })` runs on the **service client** (the booking token is the bearer secret): resolves the booking by `testimonial_token`, snapshots `client_id`/`booking_id`/`service_type`, inserts `status='pending'`, with a one-per-booking guard (pre-check + a `23505`/duplicate fallback for the unique-index race). Admin actions also use the service client: `setTestimonialStatus` flips `pending`/`approved`/`hidden` (stamps `approved_at` on approve, clears otherwise); `updateTestimonial` edits the fields; `createTestimonial` is a manual entry (`booking_id` null, defaults to `status='approved'`); `deleteTestimonial` removes the row. Every admin action revalidates `/testimonials` + `/admin/testimonials`. |
| `goals.ts` | `createGoal`, `updateGoal`, `deleteGoal` | Phase 3. One set of actions for **both** audiences (client self-serve from `/dashboard/progress`, Rachel on `/admin/clients/[id]`), all via the **server client** (`createClient()`) so RLS gates — `client_goals` has OR-composing owner + admin policies. `createGoal` sets `client_id = input.clientId ?? user.id` and `created_by = user.id`, and pre-checks the admin role only when `clientId` differs from the caller (clean error vs raw policy violation). Each revalidates `/dashboard/progress` + `/admin/clients/<clientId>`. |

---

## Stripe Integration

**Service/price config:** `src/lib/stripe/products.ts`
- `SERVICES` record maps `ServiceKey` → price ID + amount + mode
- `BOOKABLE_SERVICES` array determines which services require slot selection (coaching + interview prep only)
- All price IDs read from env vars at runtime; fallback strings used in development
- **To add a new service:** Add a `ServiceKey`, add to `SERVICES`, add to `SERVICE_SELECT_OPTIONS`, add the env var

**Quote-only services** (no Stripe product yet):
Some services run on custom quotes routed through `/consultation` instead of `/book` Stripe Checkout — Recruitment & Candidate Screening (`/services/recruitment-screening`) is the current example. These services skip `src/lib/stripe/products.ts` entirely and surface only on the marketing pages (`/services` overview, `/investment`, dedicated detail page) and the onboarding "services interested" multi-select. The intake schema may be defined in `src/lib/intake/schemas.ts` and exported but left out of `INTAKE_SCHEMAS` until a `ServiceKey` exists — `getSchemaForService` is only called from the session workspace, which requires a booking, which requires a Stripe product. When you later wire one up, register the schema in one line.

**Lazy Proxy singleton (`src/lib/stripe/client.ts`):**
Stripe client is wrapped in a `Proxy` to defer initialization until first access. This prevents build failures when `STRIPE_SECRET_KEY` is not set during `next build`.

**Checkout flow:**
1. `createBookingCheckoutSession` builds a Stripe Checkout session with all booking metadata embedded in `session.metadata`
2. Client is redirected to Stripe; on success redirected to `/book/success?session_id=...`
3. Stripe POSTs `checkout.session.completed` to `/api/webhooks/stripe`

**Shared session finalizer (`src/lib/booking/finalize.ts`):**
`finalizeSession(args)` is the single path both invitation branches use to turn an accepted invitation into a session (`bookings` row): idempotency, client-by-email resolution, overlap guard, booking insert, `payments` row (paid only), `createCalendarEvent`, invitation/option stamping, admin notification, and the `session_confirmed` + `new_session_booked` emails. Display helpers live in `src/lib/booking/display.ts` (`meetingTypeLabel`, `meetingLocationLine`, `formatDuration`).

**Webhook (`src/app/api/webhooks/stripe/route.ts`):**
- Validates signature with `stripe.webhooks.constructEvent`
- Four handlers for `checkout.session.completed`, routed by metadata/mode in this order: `handleInvitationCheckoutCompleted` (`metadata.flow === 'invitation'` → delegates to `finalizeSession`), `handleProposalCheckoutCompleted` (`metadata.flow === 'proposal'`), `handleSubscriptionCheckoutCompleted` (mode: `subscription`), and `handleCheckoutCompleted` (one-time `/book`).
- **Proposal branch** (`handleProposalCheckoutCompleted`): a paid consulting proposal cleared Stripe (ad-hoc `price_data`, `metadata.flow='proposal'`, `proposalId`). Marks the proposal `paid` (stamps `paid_at` + stripe ids), inserts a `payments` row with `proposal_id`, sends the client a `receipt` email, and `notifyAdmin('proposal_paid')`. Idempotent via the `proposals.status === 'paid'` check + the partial UNIQUE index on `proposals.stripe_session_id`. (`$0` proposals never reach Stripe — `acceptProposal` confirms them directly.)
- Uses service client (bypasses RLS)
- Retrieves the PaymentIntent with `expand: ['latest_charge']` so the receipt email can render the card brand / last4 and link to Stripe's hosted receipt URL. Helper: `fetchPaymentMethodSummary`.
- Looks up the latest `signed_service_agreements` row for the client; passes `signed_agreement_url = /dashboard/legal/signed/{id}` into the welcome email so the conditional contract link renders. Helper: `fetchSignedAgreementUrl`.
- After booking insert: calls `createAdminNotification({ type: 'new_booking', ... })` and inserts a `Review intake when submitted` admin task (the unique partial index on `admin_tasks(related_booking_id) WHERE title = 'Review intake when submitted'` makes the insert idempotent across webhook retries).
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
| `POST /api/consultation` | `/consultation` page `ConsultationForm` (`src/components/marketing/ConsultationForm.tsx`) | Validates required fields + timing whitelist, sends admin alert via `sendConsultationRequest` (Resend, `replyTo` = submitter). Best-effort: client auto-reply via `sendConsultationRequestAutoReply`, GHL sync via `syncContactToGHL` with tags `["thryve-lead", "consultation-requested"]`, and a `leads` row insert via the service client (`source='consultation'`, `status='new'`) so the request can be tracked + converted to a proposal. Body: `{ firstName, lastName, email, phone?, timing?, message }`. |

Both routes run server-side only; no auth required (public forms). The service client is used for `/api/newsletter` because `newsletter_subscribers` has an anon-insert RLS policy, but service client avoids any RLS surprises.

---

## Cron Jobs

All cron endpoints share the same auth pattern (`Authorization: Bearer {CRON_SECRET}`, `isAuthorized()` allows all when the env var is unset for local testing). Schedules live in cron-job.org; see `docs/integrations.md` → "cron-job.org" for the inventory and per-job setup steps.

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/job-alerts` | `0 9 * * 1` (Mon 9 AM UTC) | Weekly digest email of already-assigned matches per active subscriber. |
| `/api/cron/job-feed` | `0 8 * * *` (daily 8 AM UTC) | Automated multi-source ingest. Processes `JOB_FEED_BATCH` (default 5) least-recently-fed active clients per run via the `watchlist_profiles.last_feed_at` cursor → `getEnabledSources()` → `ingestForClient` (fetch → dedup → score → assign → `new_job_match` notify) → stamps `last_feed_at`. Batching keeps each run under Hobby's 10s cap (free). Logs a `job_feed_run` row to `automation_log`; idempotent. |
| `/api/cron/application-reminders` | `0 14 * * *` (daily) | T+7/14/30 nudges after a match hits `applied` (`application_reminder` email + in-app). Idempotent via `automation_log` event_key `application_reminder:{matchId}:{milestone}`. |
| `/api/cron/newsletter-send` | `0 * * * *` (hourly) | Fetches `newsletter_issues` where `status='scheduled' AND scheduled_for <= NOW()` and calls `sendIssue` for each. Hourly precision means a 9:15 AM schedule sends at 10 AM. |
| `/api/cron/newsletter-reengage` | `0 14 * * 3` (Wed 9 AM Central) | Sends "we missed you" to subscribers inactive 60+ days (capped 50/run). |
| `/api/cron/newsletter-milestones` | `0 14 * * *` (daily) | Sends thank-you emails on the 6-month and 1-year anniversary of signup. |
| `/api/cron/intake-overdue-alert` | Daily | Emails Rachel a digest of overdue intakes AND inserts one `admin_notifications` row per booking. Idempotent via `automation_log` event_key `intake_overdue_alert_sent`. |
| `/api/cron/session-reminders` | Hourly | T-24h client reminder (`session_reminder_24h` email) + T-2h Rachel prep summary. The T-24h branch also writes a `session_in_24h` row to `admin_notifications` so it surfaces in the bell. |
| `/api/cron/post-service-followup` | Daily | Sends `post_service_followup` email 24h after `workflow_status = 'completed'`; transitions to `follow_up_sent`. Phase 3: now selects `bookings.testimonial_token` and sets the email's `testimonial_url` to `${APP_URL}/testimonial/${testimonial_token}` (per-booking, prefilled), with a null-token fallback to `/testimonials` — fixes the previously dead `/testimonial` 404. |
| `/api/cron/auto-complete-sessions` | Hourly | Marks `session_scheduled` → `completed` 24h+ past `session_at`. |
| `/api/cron/intake-reminders` | Daily | T-48h and T-24h intake reminder emails. |
| `/api/cron/extend-availability` | Daily | Materializes recurring patterns into `availability_slots` for the next 8 weeks. |

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

`scoreJobAgainstProfile(profile, job)` returns `{ score: 0–100, label, reasons[], excluded? }`. Base weights (sum 100):

| Signal | Max pts | How it scores |
|---|---|---|
| Role / title keyword overlap | 30 | tokens from `target_roles` matched against job title (worth more) and description |
| Keywords | 12 | fraction of `keywords[]` found in title + description |
| Skills | 12 | fraction of `skills[]` found in description |
| Location / remote fit | 18 | full credit when remote-pref matches `is_remote`, or location string overlaps |
| Salary band overlap | 10 | parses `job.salary_range` and compares against `salary_min`/`salary_max` |
| Experience level | 8 | matches level keywords in title + description |
| Certifications | 5 | fraction of `certifications[]` found in description |
| Industry mention | 5 | substring match between `industries[]` and company/description |

**Bonuses** (added, clamped to 100): preferred employer `+8`; nice-to-haves up to `+5`.
**Hard gates** (return `score 0, excluded: true`): job company matches an `excluded_employers` entry, or any `must_haves` phrase is absent from the title+description.

Threshold: `score ≥ 60` is included. Tier labels: `80+` → `strong`, `65–79` → `good`, `60–64` → `maybe`. Stored in `client_job_matches.score_label`. Covered by `scripts/verify-scoring.ts` (`npx tsx scripts/verify-scoring.ts`).

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

## Admin Notifications (email + in-app bell)

Every inbound lead/subscriber/client interaction notifies Rachel. Two helpers:

- **`sendAdminAlert(args)`** (`src/lib/email/resend.ts`) — one branded admin email via `renderShell`; `to = ADMIN_EMAIL ?? hello@thryvegrowth.co`; supports `subject`, `headline`, `fields[]` (label/value table), `body`, `ctaUrl`/`ctaLabel`, `replyTo`.
- **`notifyAdmin(args)`** (`src/lib/notifications/admin.ts`) — fires `sendAdminAlert` **and** `createAdminNotification` (bell) in one best-effort call (`Promise.allSettled`); builds the email CTA from `NEXT_PUBLIC_APP_URL + link`. Prefer this at every touchpoint.

| Interaction | Entry point | `notifyAdmin` type |
|---|---|---|
| New / resubscribed newsletter subscriber | `api/newsletter/route.ts` | `new_subscriber` |
| Newsletter unsubscribe | `api/newsletter/unsubscribe/[token]/route.ts` | `subscriber_unsubscribed` |
| Newsletter preferences / resubscribe | `api/newsletter/manage/[token]/route.ts` | `subscriber_updated` |
| Job Alerts subscription purchase | `webhooks/stripe` → `handleSubscriptionCheckoutCompleted` | `new_subscription` |
| Subscription cancelled / paused / past_due / payment failed | `webhooks/stripe` → `handleSubscriptionDeleted` / `handleSubscriptionUpdated` / `handleInvoicePaymentFailed` (shared `alertSubscriptionIssue`) | `subscription_issue` |
| Client edits watchlist preferences | `actions/watchlist.ts` → `saveWatchlistProfile` (update branch) | `watchlist_updated` |
| Client changes application status (≠ `new`) | `actions/watchlist.ts` → `updateMatchStatus` | `application_status` |
| Client sends a message | `actions/messages.ts` → `sendMessage` (client→admin) | `client_message` (email already sent; bell added) |

Already covered pre-existing (left as direct sends): contact (`sendContactFormSubmission`), consultation (`sendConsultationRequest`), job-watchlist lead, one-time booking + intake (`sendAdminBookingAlert`), newsletter feedback. All admin-notify calls are best-effort and never block the user's action. The `admin_notifications.type` CHECK is widened in `0021_admin_notification_types.sql`.

### On/off toggles (`/admin/settings`)
Every non-critical notification can be disabled per channel + audience via the `notification_settings` table (migration `0022`). The gate lives in **`src/lib/notifications/settings.ts`**: `getDisabledNotificationKeys()` (service-client read of `enabled=false` rows, ~60s in-memory TTL cache, **fail-open** to empty Set) and `isNotificationDisabled(key)` (true if the key OR its audience master `admin_all`/`client_all` is disabled).

**`sendTemplated` gate override:** `sendTemplated` defaults its suppression key to `client_email:<templateKey>`, but accepts an optional `gateKey` for admin-audience templates — `finalizeSession` sends `new_session_booked` with `gateKey: 'admin_email:new_session_booked'` so it follows the admin master switch, not `client_all`.

**`automation_log` idempotency requires a non-partial unique index.** Every `automation_log` upsert uses `onConflict: "event_key,booking_id"`. Migration 0026 rebuilds `automation_log_event_booking_uniq` as a **non-partial** unique index — the original (0010) was partial (`WHERE booking_id IS NOT NULL`), which Postgres won't match to a bare `ON CONFLICT`, so every audit/idempotency write silently failed until 0026.

Enforcement is centralized in the four helpers — `notifyAdmin` (checks `admin_email:<type>` for the email; bell via the next), `createAdminNotification` (`admin_bell:<type>`), `createClientNotification` (`client_bell:<type>`), `sendTemplated` (`client_email:<templateKey>`) — plus the direct send-sites that bypass them: `api/contact`, `api/consultation` (admin alert + client auto-reply), `api/leads` (`notifyRachel` + `thankLead`), `api/newsletter/route.ts` (welcome) + `feedback`, `webhooks/stripe` (one-time booking alert), `actions/intake.ts` (intake digest), `actions/messages.ts` (both directions), and the `session-reminders` (prep summary) + `intake-overdue-alert` crons. Editing a toggle: `toggleNotificationSetting` (`src/app/actions/settings.ts`) updates the row, busts the cache, and revalidates. Missing key ⇒ always sends, so critical/unseeded notifications are never gated. UI: `/admin/settings` + `NotificationToggle.tsx`.

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

## Admin Help Center (`/admin/help`)

A searchable, printable in-app documentation center that renders curated admin-facing markdown docs **read-only**.

**Content delivery — build-time generated module (deliberate, not runtime `fs`):**
- `scripts/generate-help-content.mjs` runs via the `predev`/`prebuild` npm lifecycle hooks. It reads the curated docs from `/docs` and writes `src/lib/help/content.generated.ts` (`HELP_CONTENT: Record<slug, string>`), which the app imports normally.
- **Why not `fs` at request time:** `/docs` lives outside `src/`; reading it in a serverless function needs `outputFileTracingIncludes`, and a mismatch fails **only** in the deployed Vercel function (invisible to `next dev`/`next start`). A bundled import eliminates that failure class. `/docs` stays the single source of truth — the generator only reads it. The generated file is committed so `tsc`/lint resolve it; `prebuild` regenerates it on every deploy.
- Curated docs (slugs): `rachel-admin-guide`, `admin-email-reference`, `admin-faq`, `booking-invitation-flow`. The two `admin-*` docs are admin-audience references authored for the help center.

**Library — `src/lib/help/docs.ts`:** `HELP_DOCS` registry (`{slug,title,category,description}`), `getDoc(slug)`, `parseToc()` (scans `##`/`###`, **skips fenced code blocks**, slugs with `github-slugger` for exact anchor parity with `rehype-slug`), and `buildSearchIndex()` (passed to the client search).

**Rendering — `src/components/help/`:** `MarkdownDoc.tsx` (RSC) renders with `react-markdown` + `remark-gfm` + `rehype-slug`, styled with the blog's `prose` classes; its `code`/`pre` overrides turn ```mermaid fences into `<Mermaid>`. `Mermaid.tsx` (`"use client"`) lazy-imports `mermaid` (own code-split chunk, admin-only; falls back to raw source on parse error). `DocSearch.tsx` (`"use client"`) does in-memory ranked substring search over the prop index. `PrintButton.tsx` mirrors the signed-agreement `window.print()` button.

**Routes — `src/app/(admin)/admin/help/`:** `layout.tsx` (header + global search), `page.tsx` (category-grouped doc cards), `[slug]/page.tsx` (`generateStaticParams` over the 4 slugs; renders `MarkdownDoc` + a sticky TOC + Print). Admin gating is inherited from the `(admin)` layout.

**Print → PDF:** browser `window.print()` only (no server-side PDF). `print:hidden` is set on `AdminNav`'s `<aside>`, the admin layout `<header>`, and the help sidebar/TOC/search; the article uses `print:border-0 print:p-0`. Mermaid SVGs print natively (`print:break-inside-avoid`).

**Deps added:** `react-markdown`, `remark-gfm`, `rehype-slug`, `github-slugger`, `mermaid` (the last is client-only + lazy).

---

## AI assist suite (Phase 4 — bring-your-own-ChatGPT)

A "Draft with ChatGPT" assist suite that gives Rachel a head start on her recurring writing tasks. **It is deliberately NOT an API integration:** there are no API keys, no new dependencies, no env vars, and no DB migration. The app assembles a context-rich **prompt**; Rachel clicks **Copy prompt**, opens her own ChatGPT (an "Open ChatGPT" link → `chatgpt.com`), pastes it, then pastes the reply back into the app — which either fills the relevant fields or saves it. Every output is human-reviewed before it is saved or sent (human-in-the-loop).

**Prompt library — `src/lib/ai/prompts.ts`:** Pure string functions, intentionally free of React and server-only imports so the same module runs client-side **and** in the unit test.
- **Eight `build*Prompt(ctx)` builders**, each taking a typed context object and returning prompt text: `buildSessionSummaryPrompt`, `buildPrepBriefPrompt`, `buildResumeReviewPrompt`, `buildJobMatchPrompt`, `buildCoverLetterPrompt`, `buildProposalScopePrompt`, `buildMessageReplyPrompt`, `buildLeadFollowupPrompt`. A shared `PERSONA` string sets Rachel's voice; helpers (`clip`, `line`, `block`) keep prompts tidy and omit empty fields, with a per-field char cap.
- **`humanizeIntake(serviceKey, responses)`** — renders a service's intake JSON as readable `- Label: answer` lines using `getSchemaForService` from `src/lib/intake/schemas.ts` (the same schema the intake UI uses); skips empty answers, renders uploaded files by filename (never `[object Object]`), and falls back to raw keys when no schema is registered.
- **`splitInOrder(text, labels)`** — parses ChatGPT's labelled reply into an ordered array aligned to `labels`. Anchors on headers like `### SUMMARY` / `**SUMMARY**` / `SUMMARY:` on their own line (case-insensitive); if **no** header is found, all text goes to the first label and the rest are empty (graceful fallback for a clumsy paste).

**Shared panel — `src/components/admin/AiAssistPanel.tsx` (`"use client"`):** The one reusable collapsible panel. It shows the prompt read-only with a **Copy prompt** button + **Open ChatGPT** link. It is domain-agnostic: when an `onApply(pastedText)` handler is passed it also renders a paste-back `Textarea` + apply button (the handler receives the RAW pasted text and each caller parses/routes it); when `onApply` is omitted it is **copy-only**. Props: `label`, `prompt`, `instructions?`, `applyHint?`, `onApply?`, `applyLabel?` (default "Apply to fields"), `defaultOpen?`. The panel toasts on copy; callers toast on apply.

**The eight wiring points** (apply = paste-back fills fields/saves; copy = copy-only):

| # | Assist | Mode | Where it lives | Apply path reuses |
|---|---|---|---|---|
| 1 | Session summary + next steps | apply | `src/components/admin/SessionRecordEditor.tsx` (new optional `aiContext` prop) | `splitInOrder(raw, ["SUMMARY","NEXT STEPS"])` → sets the Summary + Next steps state; saved via the existing `updateSession` (`src/app/actions/booking.ts`) |
| 2 | Pre-session prep brief (for Rachel) | copy | also in `SessionRecordEditor.tsx` | — |
| 3 | Resume review | apply → save | `src/components/admin/ResumeReviewAssist.tsx`, in the Documents area of the client-detail page | pasted review saved as a private note via the existing `addClientNote` (`src/app/actions/documents.ts`) |
| 4 | Job-match "why it matches" + recommended action | apply | `src/components/admin/WatchlistManager.tsx` (new `watchlistProfile` prop) | `splitInOrder(raw, ["MATCH REASON","RECOMMENDED ACTION"])` → fills the two fields before the existing `assignJobToClient` curate-and-send (`src/app/actions/watchlist.ts`) |
| 5 | Cover letter | copy | also in `WatchlistManager.tsx` | — |
| 6 | Proposal scope & terms | copy | `src/components/admin/ProposalForm.tsx`, near the rich-text editor (the Tiptap editor has no programmatic set, so Rachel pastes the draft in herself) | — |
| 7 | Message reply | apply | `src/components/messaging/MessageThread.tsx` (admin only; new `aiReplyClientName` prop) | sets the reply `body` state; sent via the existing `sendMessage` (`src/app/actions/messages.ts`) |
| 8 | Lead follow-up email | copy | `src/components/admin/LeadFollowupAssist.tsx`, a client island on the server-rendered lead page | — |

**Page-level prop wiring (where the context comes from):**
- `src/app/(admin)/admin/clients/[id]/page.tsx` — passes `aiContext` to `SessionRecordEditor` and renders `ResumeReviewAssist`. Its bookings `.select(...)` was **widened** to include `session_type, client_notes, admin_notes` to feed the prompts.
- `src/app/(admin)/admin/watchlists/[clientId]/page.tsx` — passes `watchlistProfile` to `WatchlistManager`.
- `src/app/(admin)/admin/messages/[clientId]/page.tsx` — passes `aiReplyClientName` to `MessageThread`.
- `src/app/(admin)/admin/proposals/new/page.tsx` — now also fetches the lead's `notes, target_role, timeline, current_position, admin_notes` and passes them as a `leadContext` prop to `ProposalForm`.
- `src/app/(admin)/admin/leads/[id]/page.tsx` — renders `LeadFollowupAssist`.

**Controlled-field refactor:** `WatchlistManager.tsx`'s five manual-add fields (title, company, description, "why it matches", recommended action) were refactored to controlled React state so the job-match apply handler can write "Why it matches" and "Recommended action" into them.

**Reused with NO change:** `updateSession`, `addClientNote`, `assignJobToClient`, `sendMessage`. No new tables, env vars, or dependencies.

**Unit test — `scripts/test-phase4-prompts.mts`:** Pure tests for the builders + parser, with **no DB, env, or network**. Asserts `splitInOrder` header parsing and the no-header fallback, that `humanizeIntake` renders clean Q&A (no `undefined` / `[object Object]` / `null`), and that every builder produces clean output. Run with `npx tsx scripts/test-phase4-prompts.mts`.

---

## Known Gaps

1. **No role management UI** — `profiles.role` can only be changed via the Supabase dashboard or SQL. There is no admin panel control.
