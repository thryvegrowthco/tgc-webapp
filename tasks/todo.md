# Task 07 (run G): add-to-calendar links + visible Google Calendar failures

Branch: `feat/add-to-calendar` (from origin/main b4edc03)

## Plan

### New files
- [x] `src/lib/crypto/sign.ts` - HMAC-SHA256 sign/verify for unauthenticated `.ics` links (reuses `INTEGRATIONS_ENCRYPTION_KEY`, domain-separated; no new env var).
- [x] `src/lib/booking/calendar-links.ts` - `googleCalendarTemplateUrl`, `buildIcs` (RFC 5545, CRLF, UTC Z, escaping, 75-octet folding, METHOD:PUBLISH, ORGANIZER), and a `buildSessionCalendar` helper shared by pages/route/email.
- [x] `src/app/api/sessions/[bookingId]/ics/route.ts` - owner-session OR `?t=` HMAC token; `text/calendar` attachment; 404 for cancelled / no session_at.
- [x] `src/components/booking/AddToCalendarLinks.tsx` - presentational two-link block + "already accepted Rachel's invite" note.
- [x] `src/components/admin/RetryCalendarEventButton.tsx` - admin "Create calendar event" retry.
- [x] `supabase/migrations/0036_session_email_calendar_links.sql` (+ `apply-0036.sql`) - append calendar paragraph + placeholders to `session_confirmed` and `session_reminder_24h` DB rows. File only.

### Modified
- [x] `src/lib/google/calendar.ts` - summary `${serviceType}: ${clientName}` (was em dash); record `google_calendar_auth_failed` + once/day admin bell on refresh/401 failures; set `connected_at` on reconnect; `getIntegrationStatus` returns `reconnectNeeded`.
- [x] `src/lib/booking/finalize.ts` - pass `add_to_google_calendar_url` + `ics_url` to `session_confirmed`; attach `.ics`.
- [x] `src/app/actions/sessions.ts` - `retryCalendarEvent(bookingId)` (requireAdmin); add calendar placeholders to reschedule re-send.
- [x] `src/lib/email/defaults.ts` - calendar paragraph + placeholders for `session_confirmed` and `session_reminder_24h`.
- [x] `src/lib/email/render.ts` - optional `attachments` passthrough (backward compatible).
- [x] confirmed page + dashboard session page - render AddToCalendarLinks when `session_at` is set.
- [x] `/admin/sessions` page + SessionEditorDrawer - inline + drawer retry button for `meet_link_pending` rows.
- [x] `/admin/integrations` page - red "Reconnect needed" state.
- [x] `src/app/api/cron/session-reminders/route.ts` - pass calendar placeholders to 24h reminder.
- [x] Docs: integrations.md, admin-email-reference.md, rachel-admin-guide.md, admin-faq.md, developer-architecture.md. Then `npm run generate:help`.

### Checks
- [x] `npx tsc --noEmit`, `npx eslint <changed>`, `npm run check:og`, `npm run generate:help`.
- [x] Paste a generated sample `.ics` (fake data), confirm CRLF + folding + UTC.

## Review

Done. All items implemented against the current tree (re-checked every path; `session_rescheduled`
is not a real template key, so the reschedule flow reuses `session_confirmed` and automatically
carries the new placeholders).

- **Add-to-calendar:** `calendar-links.ts` (`googleCalendarTemplateUrl`, `buildIcs`, `buildSessionCalendar`),
  HMAC `sign.ts`, `GET /api/sessions/[bookingId]/ics` (owner OR `?t=` token; 404 cancelled/unscheduled),
  `AddToCalendarLinks` on confirmed + workspace pages, links + `.ics` attachment in `session_confirmed`
  (confirm + reschedule) and `session_reminder_24h` (cron). Default copy in `defaults.ts`; prod DB copy via
  migration `0036` (file only, `apply-0036.sql`).
- **Failure visibility:** `calendar.ts` logs `google_calendar_auth_failed` (status + Google code, no tokens),
  once-per-day admin bell (throttled by `google_calendar_auth_notified`), `getIntegrationStatus.reconnectNeeded`
  (latest failure newer than `connected_at`; `persistInitialTokens` now stamps `connected_at` on reconnect),
  red "Reconnect needed" on `/admin/integrations`. Per-session retry: `retryCalendarEvent` +
  `RetryCalendarEventButton` on `/admin/sessions` rows and in `SessionEditorDrawer`. Event `summary` is now
  `"{serviceType}: {clientName}"`.
- **Checks:** `tsc --noEmit` clean, `eslint` clean on all changed files, `check:og` clean, `generate:help` wrote 4 docs.
  Sample `.ics` validated: CRLF only, UTC `Z` times, DESCRIPTION folded at 75 octets, `METHOD:PUBLISH` + `ORGANIZER`.
- **Notes:** admin bell now uses a dedicated `calendar_issue` type (see follow-up hardening below); the red banner
  + retry do not depend on the email migration.

## Follow-up hardening (code-review fixes)

1. **Missing signing key no longer breaks flows.** Added `trySignIcsToken` (returns null + warns, never the key).
   `finalize.ts`, the session-reminders cron, the confirmed page, and the reschedule re-send in `sessions.ts` all
   use it; on failure they leave `add_to_google_calendar_url`/`ics_url` empty so the email `{{#if}}` block hides
   both links (the `.ics` attachment still works) and the rest of the flow continues.
2. **No more false "Reconnect needed."** New pure, exported `classifyGoogleError({source,status,code})` splits auth
   vs transient. Only a refresh `400/401` + `invalid_grant`/`invalid_client`/`unauthorized_client`, or a Calendar
   API `401`, records `google_calendar_auth_failed`; network/timeout/`5xx`/`403`/`429` log
   `google_calendar_transient_error` instead. `getIntegrationStatus` clears the state when a successful refresh
   (`updated_at`), reconnect (`connected_at`), or `calendar_event_created` is newer than the last failure.
3. **Dedicated `calendar_issue` notification type** (not `subscription_issue`) so the bell isn't silenced by the
   subscription preference. Added to the TS union, `NotificationListItem` label/class maps, and the
   `admin_notifications` CHECK via migration `0037_calendar_issue_notification_type.sql` (+ `apply-0037.sql`).
   Throttle marker now written before the bell for race tolerance.
4. **Retry duplicate guard.** `retryCalendarEvent` re-reads before the Google call and writes with
   `.is('calendar_event_id', null)`; if the event is created but the DB claim loses the race/errors, it returns an
   error pointing at Google Calendar instead of succeeding. Clears the stale `calendar_event_failed` row on
   success, only clears `meet_link_pending` when a Meet link comes back, and the button uses `useTransition` so it
   stays disabled through the refresh.
5. **buildIcs:** `URL` is no longer TEXT-escaped (URI value, only folded) so the `?t=` token survives; added
   `SEQUENCE:0` and `LAST-MODIFIED` (booking `updated_at` when available, else now). Removed em dashes from the
   edited docs rows for `session_confirmed`/`session_reminder_24h`/`sessions.ts`.

- **Follow-up checks:** `tsc --noEmit` clean; `eslint` clean on all changed files; `check:og` clean;
  `generate:help` regenerated. Throwaway test (not committed) exercised the real `buildIcs` (CRLF, UTC `Z`,
  `SEQUENCE:0`, `LAST-MODIFIED`, URL unescaped, TEXT escaped, 75-octet folding) and `classifyGoogleError`
  (auth vs transient across refresh/API, all cases pass).
