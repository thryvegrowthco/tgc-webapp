-- 0036_session_email_calendar_links.sql
--
-- Add "Add to calendar" links to the client-facing session emails.
--
-- Production renders email bodies from the email_templates rows (the code in
-- src/lib/email/defaults.ts is only a fallback), so the stored copy must learn
-- two new placeholders:
--   {{add_to_google_calendar_url}}  a Google Calendar "add event" template URL
--   {{ics_url}}                     a tokenized .ics download (works from email)
--
-- These are populated by createSessionBooking / performReschedule (confirmation
-- + reschedule, both rendered from `session_confirmed`) and by the T-24h
-- reminder cron (`session_reminder_24h`). This migration:
--   1. inserts a single calendar-links paragraph into each body, and
--   2. adds the two placeholder keys to the `placeholders` text[].
--
-- Idempotent: the body edit only runs on rows that don't already contain the
-- placeholder, and the placeholder keys are only appended when missing. Rows
-- Rachel has heavily customized (so the anchor text no longer matches) keep
-- their body unchanged but still gain the placeholder keys.
--
-- File only. Apply via apply-0036.sql in the Supabase SQL editor.

-- ─── session_confirmed (also used for the reschedule re-send) ────────────────
UPDATE email_templates
SET
  body_html = replace(
    body_html,
    '<p style="margin:0;color:#475569;">Looking forward to connecting with you!',
    '{{#if add_to_google_calendar_url}}<p style="margin:0 0 16px;color:#475569;"><a href="{{add_to_google_calendar_url}}" style="color:#203e35;">Add to Google Calendar</a> · <a href="{{ics_url}}" style="color:#203e35;">Apple or Outlook (.ics)</a></p>{{/if}}' || E'\n' ||
    '<p style="margin:0;color:#475569;">Looking forward to connecting with you!'
  ),
  placeholders = placeholders || ARRAY(
    SELECT x FROM unnest(ARRAY['add_to_google_calendar_url', 'ics_url']) AS x
    WHERE NOT (x = ANY (placeholders))
  ),
  updated_at = NOW()
WHERE key = 'session_confirmed'
  AND body_html NOT LIKE '%add_to_google_calendar_url%';

-- ─── session_reminder_24h ────────────────────────────────────────────────────
UPDATE email_templates
SET
  body_html = replace(
    body_html,
    'If something came up, reply to this email and we''ll find a new time.</p>',
    'If something came up, reply to this email and we''ll find a new time.</p>' || E'\n' ||
    '{{#if add_to_google_calendar_url}}<p style="margin:0 0 16px;color:#475569;"><a href="{{add_to_google_calendar_url}}" style="color:#203e35;">Add to Google Calendar</a> · <a href="{{ics_url}}" style="color:#203e35;">Apple or Outlook (.ics)</a></p>{{/if}}'
  ),
  placeholders = placeholders || ARRAY(
    SELECT x FROM unnest(ARRAY['add_to_google_calendar_url', 'ics_url']) AS x
    WHERE NOT (x = ANY (placeholders))
  ),
  updated_at = NOW()
WHERE key = 'session_reminder_24h'
  AND body_html NOT LIKE '%add_to_google_calendar_url%';
