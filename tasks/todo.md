# Task 07 (run G): add-to-calendar links + visible Google Calendar failures

Branch: `feat/add-to-calendar` (from origin/main b4edc03)

## Plan

### New files
- [ ] `src/lib/crypto/sign.ts` — HMAC-SHA256 sign/verify for unauthenticated `.ics` links (reuses `INTEGRATIONS_ENCRYPTION_KEY`, domain-separated; no new env var).
- [ ] `src/lib/booking/calendar-links.ts` — `googleCalendarTemplateUrl`, `buildIcs` (RFC 5545, CRLF, UTC Z, escaping, 75-octet folding, METHOD:PUBLISH, ORGANIZER), and a `buildSessionCalendar` helper shared by pages/route/email.
- [ ] `src/app/api/sessions/[bookingId]/ics/route.ts` — owner-session OR `?t=` HMAC token; `text/calendar` attachment; 404 for cancelled / no session_at.
- [ ] `src/components/booking/AddToCalendarLinks.tsx` — presentational two-link block + "already accepted Rachel's invite" note.
- [ ] `src/components/admin/RetryCalendarEventButton.tsx` — admin "Create calendar event" retry.
- [ ] `supabase/migrations/0036_session_email_calendar_links.sql` (+ `apply-0036.sql`) — append calendar paragraph + placeholders to `session_confirmed` and `session_reminder_24h` DB rows. File only.

### Modified
- [ ] `src/lib/google/calendar.ts` — summary `${serviceType}: ${clientName}` (was em dash); record `google_calendar_auth_failed` + once/day admin bell on refresh/401 failures; set `connected_at` on reconnect; `getIntegrationStatus` returns `reconnectNeeded`.
- [ ] `src/lib/booking/finalize.ts` — pass `add_to_google_calendar_url` + `ics_url` to `session_confirmed`; attach `.ics`.
- [ ] `src/app/actions/sessions.ts` — `retryCalendarEvent(bookingId)` (requireAdmin); add calendar placeholders to reschedule re-send.
- [ ] `src/lib/email/defaults.ts` — calendar paragraph + placeholders for `session_confirmed` and `session_reminder_24h`.
- [ ] `src/lib/email/render.ts` — optional `attachments` passthrough (backward compatible).
- [ ] confirmed page + dashboard session page — render AddToCalendarLinks when `session_at` is set.
- [ ] `/admin/sessions` page + SessionEditorDrawer — inline + drawer retry button for `meet_link_pending` rows.
- [ ] `/admin/integrations` page — red "Reconnect needed" state.
- [ ] `src/app/api/cron/session-reminders/route.ts` — pass calendar placeholders to 24h reminder.
- [ ] Docs: integrations.md, admin-email-reference.md, rachel-admin-guide.md, admin-faq.md, developer-architecture.md. Then `npm run generate:help`.

### Checks
- [ ] `npx tsc --noEmit`, `npx eslint <changed>`, `npm run check:og`, `npm run generate:help`.
- [ ] Paste a generated sample `.ics` (fake data), confirm CRLF + folding + UTC.

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
- **Notes:** admin bell reuses the existing `subscription_issue` type (prod-allowed, no schema change) so the
  notification works before 0036 is even relevant; the red banner + retry do not depend on it. The two remaining
  em dashes in edited docs are pre-existing table copy that was only appended to.
