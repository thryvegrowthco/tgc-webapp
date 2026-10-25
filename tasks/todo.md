# Run F — My Sessions + admin search (branch: fix/my-sessions-and-search)

Two commits off origin/main (4a1157f). No push/PR/deploy. Checks only:
tsc, eslint changed files, check:og, generate:help. No em/en dashes or `--` in copy.

## JOB 1 (commit 1) — admin Sessions cleanup

- [x] 1a. Fix /admin/sessions search
  - Root cause: search filter runs AFTER the status query, and the default
    "active" view only loads intake_needed/intake_complete/session_scheduled.
    So searching a client whose sessions are completed/cancelled returns nothing.
  - page.tsx: when a search `q` is present and status is the default "active",
    do NOT restrict to active statuses (search across all). Keep an explicit
    status filter when one is chosen.
  - SessionsFilters.tsx: debounce typing ~300ms, keep Enter, preserve status,
    empty search restores list, add a clear "X" button.
- [x] 1b. NewSessionDialog amount starts blank (not 125); fills on preset pick,
      stays blank for Custom / other.

## JOB 2 (commits 2+) — client "My Sessions"

- [x] 2.1 Safe post-login redirect
  - New `src/lib/auth/safe-redirect.ts` → `safeRedirectPath(input): string | null`.
  - Login: server wrapper reads `redirect` searchParam → client `LoginForm`
    hidden field. `logIn` honors a valid redirect, else landingPathFor.
  - Validate `next` in `src/app/auth/callback/route.ts` with the helper.
  - `scripts/test-safe-redirect.mts` asserts (run with tsx if available).
- [x] 2.2 Confirmed page: read the booking's own client_id; show
      "View your session details" + muted sign-in note whenever booking has a
      client; else keep "Back to Thryve Growth Co."
- [x] 2.3 Workspace: admin who doesn't own the booking → redirect to
      /admin/clients/<client_id>#booking-<id>, or /admin/sessions if no client.
- [x] 2.4 Sessions list: add `/dashboard/sessions` list page, redirect
      `/dashboard/bookings` to it. Rows link to the workspace, show session_at
      (Central, slot fallback, then "Time to be confirmed"), status pill from
      workflow_status (shared SESSION_STATUS_COPY in lib/booking/display.ts),
      split Upcoming / Past. Nav label → "My Sessions". Update /book/success and
      overview links + overview recent list (same date/link fix).
- [x] 2.5 No em/en dashes in changed copy.
- [x] 2.6 Docs: workflows.md, developer-architecture.md, rachel-admin-guide.md,
      admin-faq.md; then generate:help.

## Review

Branch `fix/my-sessions-and-search` off origin/main (4a1157f). Two commits.

**Commit 1 - b5ab8ed `fix(sessions): live cross-status admin search, blank new-session amount`**
- Root cause of the "Thomas" search miss: the search filter ran over rows already
  narrowed by the default "active" status query (intake_needed / intake_complete /
  session_scheduled), so a client whose sessions were completed or cancelled matched
  nothing. Fix: when a search `q` is present the server page skips the active-only
  restriction (an explicitly chosen status still scopes the search). The needle
  already matched full_name, email, guest_name, guest_email, and service_type.
- SessionsFilters: 300ms debounce + Enter + clear "X"; preserves the status param;
  empty search restores the list.
- NewSessionDialog Amount now starts blank; fills on a preset pick, blank for Custom.

**Commit 2 - 4228857 `feat(sessions): client "My Sessions" + safe post-login redirect`**
- safeRedirectPath helper + login server wrapper/LoginForm + logIn + auth callback.
- Confirmed page uses the booking's own client_id; new button + sign-in note.
- Workspace: admin not owning the booking redirects to the client record / Sessions.
- New /dashboard/sessions list (Upcoming/Past); /dashboard/bookings redirects to it;
  nav renamed "My Sessions"; overview recent list + /book/success + documents updated.
- Shared SESSION_STATUS_COPY / sessionStatusInfo / sessionWhenLine in display.ts.

**Checks:** `npx tsc --noEmit` clean; `npx eslint` on all changed files clean;
`npm run check:og` passes; `npm run generate:help` regenerated (4 docs) and the new
copy appears. `scripts/test-safe-redirect.mts` could not run locally (tsx not
installed, Node 20 has no type-strip); the real compiled function was verified
separately against 16 assertions, all passing.

**Notes for Thomas:**
- No migrations. No dashboard steps.
- Invited clients without a password: the "View your session details" button leads
  to /login. A client who has not activated their account yet (no password set)
  still needs their activation / invite email (or a password reset) before they can
  sign in. The ResendInviteButton on the client record covers this.
