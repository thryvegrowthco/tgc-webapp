-- Thryve Growth Co. — combined booking-invitation migrations (0023 → 0026)
-- For a FRESH Supabase (e.g. production deploy): paste into SQL Editor → Run.
-- Re-running against an already-migrated DB will error on the CREATE POLICY
-- lines (run the individual remaining migration instead). Generated 2026-06-09T21:03:16Z.

-- ============================================================================
-- supabase/migrations/0023_booking_invitations.sql
-- ============================================================================
-- Thryve Growth Co. — Admin-initiated Booking Invitations → Sessions
--
-- Adds the invitation layer on top of the existing booking/session pipeline:
-- Rachel hand-picks several date/time options for one client, emails a branded
-- "Choose a Time" link to a PUBLIC token page, the client picks one, and the
-- system finalizes a session (a `bookings` row) through the shared
-- finalizeSession() path — calendar event, emails, notifications, audit.
--
-- All additions are additive — existing rows and the /book flow keep working.
--
-- Tables added:
--   booking_invitations         — one row per invitation Rachel sends
--   booking_invitation_options  — the free-form date/time choices (child rows)
--
-- Columns added to `bookings`:
--   duration_minutes, location_type, location_details, session_type,
--   payment_status, follow_up_needed, session_summary, next_steps,
--   booking_invitation_id, rescheduled_from_booking_id, updated_at
--
-- Also widens the bookings.workflow_status CHECK (+no_show, +rescheduled) and
-- admin_notifications.type CHECK (+session_booked_via_invite), and seeds 3
-- editable email templates.

-- ─── booking_invitations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- The public bearer token embedded in the email link. 16 random bytes → 32 hex.
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable: client may have no account
  client_email TEXT NOT NULL,
  client_name TEXT,
  service_type TEXT NOT NULL,
  service_key TEXT,
  session_type TEXT,
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  location_type TEXT NOT NULL DEFAULT 'google_meet'
    CHECK (location_type IN ('google_meet', 'phone', 'in_person', 'custom')),
  location_details TEXT,
  requires_payment BOOLEAN NOT NULL DEFAULT FALSE,
  amount_cents INT,
  stripe_price_id TEXT,
  custom_message TEXT,
  internal_notes TEXT,  -- admin-only; never rendered to the client
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_option_id UUID,  -- FK added after options table exists (below)
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── booking_invitation_options ───────────────────────────────────────────────
-- One row per offered time. A child table (not JSONB) so a single atomic
-- conditional UPDATE can reserve exactly one option and win the race.
CREATE TABLE IF NOT EXISTS booking_invitation_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES booking_invitations(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,      -- Central wall-clock date
  start_time TIME NOT NULL,     -- Central wall-clock time
  session_at TIMESTAMPTZ NOT NULL,  -- precomputed UTC moment (localCentralToUtcIso)
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reserved', 'consumed', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (invitation_id, session_at)
);

-- accepted_option_id FK (now that the options table exists)
ALTER TABLE booking_invitations
  DROP CONSTRAINT IF EXISTS booking_invitations_accepted_option_fk;
ALTER TABLE booking_invitations
  ADD CONSTRAINT booking_invitations_accepted_option_fk
  FOREIGN KEY (accepted_option_id) REFERENCES booking_invitation_options(id) ON DELETE SET NULL;

-- ─── bookings: column additions ───────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'google_meet',
  ADD COLUMN IF NOT EXISTS location_details TEXT,
  ADD COLUMN IF NOT EXISTS session_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS follow_up_needed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_summary TEXT,
  ADD COLUMN IF NOT EXISTS next_steps TEXT,
  ADD COLUMN IF NOT EXISTS booking_invitation_id UUID REFERENCES booking_invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_from_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Existing rows predate the invitation flow → they were all Stripe-paid.
UPDATE bookings SET payment_status = 'paid'
  WHERE payment_status = 'not_required' AND stripe_session_id IS NOT NULL;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_location_type_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_location_type_check
  CHECK (location_type IN ('google_meet', 'phone', 'in_person', 'custom'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('not_required', 'pending', 'paid', 'refunded', 'waived'));

-- Widen workflow_status: + no_show, + rescheduled (Phase 2 writes these; added
-- now so Phase 2 needs no second migration).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workflow_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_workflow_status_check
  CHECK (workflow_status IN (
    'booked', 'intake_needed', 'intake_complete',
    'session_scheduled', 'completed', 'follow_up_sent', 'cancelled',
    'no_show', 'rescheduled'
  ));

-- ─── admin_notifications: widen type for the invitation booking event ──────────
ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check
  CHECK (
    type IN (
      'new_booking', 'intake_submitted', 'client_doc_upload', 'intake_overdue',
      'session_in_24h', 'new_subscriber', 'subscriber_unsubscribed',
      'subscriber_updated', 'new_subscription', 'subscription_issue',
      'watchlist_updated', 'application_status', 'client_message',
      -- added 0023
      'session_booked_via_invite'
    )
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS booking_invitations_client_email_idx ON booking_invitations(client_email);
CREATE INDEX IF NOT EXISTS booking_invitations_status_idx ON booking_invitations(status);
CREATE INDEX IF NOT EXISTS booking_invitations_client_id_idx ON booking_invitations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_invitations_expires_at_idx ON booking_invitations(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS booking_invitation_options_invitation_idx ON booking_invitation_options(invitation_id);
CREATE INDEX IF NOT EXISTS booking_invitation_options_session_at_idx ON booking_invitation_options(session_at);
CREATE INDEX IF NOT EXISTS bookings_booking_invitation_id_idx ON bookings(booking_invitation_id) WHERE booking_invitation_id IS NOT NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE booking_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_invitation_options ENABLE ROW LEVEL SECURITY;

-- Admins manage everything.
CREATE POLICY "booking_invitations_admin" ON booking_invitations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "booking_invitation_options_admin" ON booking_invitation_options
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- A logged-in client can read invitations addressed to their account (so the
-- portal can surface a pending invite). The PUBLIC token page does NOT rely on
-- RLS — it uses the service client (token is the bearer secret), exactly like
-- the newsletter unsubscribe page.
CREATE POLICY "booking_invitations_select_own" ON booking_invitations
  FOR SELECT USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "booking_invitation_options_select_own" ON booking_invitation_options
  FOR SELECT USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM booking_invitations bi
      WHERE bi.id = booking_invitation_options.invitation_id
        AND bi.client_id = auth.uid()
    )
  );

-- ─── Email templates ──────────────────────────────────────────────────────────
-- Inner body HTML only; the brand shell is applied at render time. Keep in sync
-- with DEFAULT_TEMPLATES in src/lib/email/defaults.ts.
INSERT INTO email_templates (key, subject, body_html, placeholders, description) VALUES
  (
    'booking_invitation',
    'Choose a Time for Your Thryve Session',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">I''m excited to get your session scheduled. Please choose the date and time that works best for you using the link below:</p>
{{#if custom_message}}<p style="margin:0 0 16px;color:#475569;">{{custom_message}}</p>{{/if}}
<p style="margin:0 0 28px;text-align:center;">
  <a href="{{booking_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Choose My Session Time</a>
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 10px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Session details</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Session length:</strong> {{session_length}}</p>
    <p style="margin:0;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">Once you select your time, you''ll receive a confirmation email with the session details. If none of the times work, just reply to this email and I''ll send over a few more options.</p>
<p style="margin:0;color:#475569;">Looking forward to connecting with you!<br/>— Rachel</p>',
    ARRAY['client_name','booking_url','custom_message','service_type','session_length','meeting_type'],
    'Sent to the client when Rachel sends a booking invitation. CTA links to the public booking page.'
  ),
  (
    'session_confirmed',
    'Your Thryve Session is Confirmed',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">You''re officially scheduled!</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 10px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Session details</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Date:</strong> {{session_date}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Time:</strong> {{session_time}} (CT)</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Length:</strong> {{session_length}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
    {{#if meeting_location}}<p style="margin:0;color:#0f172a;"><strong>Where:</strong> {{meeting_location}}</p>{{/if}}
  </td></tr>
</table>
{{#if meet_link}}<p style="margin:0 0 24px;text-align:center;">
  <a href="{{meet_link}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Join Google Meet</a>
</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;">Before your session, please complete any required intake forms or send over anything you''d like me to review in advance. You can also reply to this email if anything changes.</p>
{{#if session_workspace_url}}<p style="margin:0 0 16px;color:#475569;">Your session workspace is <a href="{{session_workspace_url}}" style="color:#203e35;">here</a>.</p>{{/if}}
<p style="margin:0;color:#475569;">Looking forward to connecting with you!<br/>— Rachel</p>',
    ARRAY['client_name','service_type','session_date','session_time','session_length','meeting_type','meeting_location','meet_link','session_workspace_url'],
    'Sent to the client when they select a time from a booking invitation (or pay for one).'
  ),
  (
    'new_session_booked',
    'New Session Booked: {{client_name}}',
    '<p style="margin:0 0 16px;">Hi Rachel,</p>
<p style="margin:0 0 16px;">A client has selected a session time.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Client:</strong> {{client_name}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Email:</strong> {{client_email}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>
    {{#if session_type}}<p style="margin:0 0 6px;color:#0f172a;"><strong>Session type:</strong> {{session_type}}</p>{{/if}}
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Date:</strong> {{session_date}}</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Time:</strong> {{session_time}} (CT)</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>Duration:</strong> {{session_length}}</p>
    <p style="margin:0;color:#0f172a;"><strong>Meeting type:</strong> {{meeting_type}}</p>
  </td></tr>
</table>
{{#if client_notes}}<p style="margin:0 0 16px;color:#475569;"><strong>Client notes:</strong> {{client_notes}}</p>{{/if}}
<p style="margin:0 0 28px;text-align:center;">
  <a href="{{admin_session_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">View Session</a>
</p>
{{#if calendar_link}}<p style="margin:0;color:#475569;">Calendar event: <a href="{{calendar_link}}" style="color:#203e35;">open in Google Calendar</a></p>{{/if}}',
    ARRAY['client_name','client_email','service_type','session_type','session_date','session_time','session_length','meeting_type','client_notes','admin_session_url','calendar_link'],
    'Sent to Rachel when a client books a session via an invitation.'
  )
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- supabase/migrations/0024_session_reminders_reschedule.sql
-- ============================================================================
-- Thryve Growth Co. — Phase 2: 1-hour reminder, reschedule support, reservation TTL
--
-- Additive follow-up to 0023. No data migration needed.
--
-- Adds:
--   bookings.reminder_1h_sent_at                — idempotency for the T-1h client reminder
--   booking_invitation_options.reserved_at      — stamped on reserve; lets the cron sweep
--                                                  release options left reserved by abandoned
--                                                  (payment-ON) checkouts
--   email_templates 'session_reminder_1h'       — editable T-1h reminder copy

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

ALTER TABLE booking_invitation_options
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS booking_invitation_options_reserved_idx
  ON booking_invitation_options(reserved_at) WHERE status = 'reserved';

INSERT INTO email_templates (key, subject, body_html, placeholders, description) VALUES
  (
    'session_reminder_1h',
    'Starting soon — your Thryve session at {{session_time}}',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your session starts in about an hour. Here are the details so you''re ready:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">When</p>
    <p style="margin:0 0 16px;color:#0f172a;font-weight:600;">{{session_date}} at {{session_time}} (CT)</p>
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">{{meeting_type}}</p>
    {{#if meet_link}}<p style="margin:0;"><a href="{{meet_link}}" style="color:#203e35;font-weight:600;text-decoration:none;">{{meet_link}}</a></p>{{/if}}
    {{#if meeting_location}}<p style="margin:0;color:#0f172a;">{{meeting_location}}</p>{{/if}}
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">See you soon!</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','session_date','session_time','meeting_type','meet_link','meeting_location','session_workspace_url'],
    'Sent ~1 hour before the session. Critical — never seeded into notification_settings.'
  )
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- supabase/migrations/0025_booking_invitation_hardening.sql
-- ============================================================================
-- Thryve Growth Co. — Hardening for the booking-invitation feature (post-review)
--
-- 1. Make booking_invitation_id UNIQUE so one invitation can only ever produce
--    one session, even under a concurrent-accept / double-webhook race. The app
--    treats the unique violation as the already-finalized (idempotent) case.
-- 2. Remove the client-readable RLS on invitations: it exposed the admin-only
--    internal_notes column to the linked client (RLS is row-level, not
--    column-level). No app surface reads invitations from a client context — the
--    public booking page uses the service client. Keep admin-only access.

-- ─── 1. Unique invitation → booking ───────────────────────────────────────────
DROP INDEX IF EXISTS bookings_booking_invitation_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_invitation_id_key
  ON bookings(booking_invitation_id) WHERE booking_invitation_id IS NOT NULL;

-- ─── 2. Drop client SELECT on invitation tables (internal_notes hardening) ─────
DROP POLICY IF EXISTS "booking_invitations_select_own" ON booking_invitations;
DROP POLICY IF EXISTS "booking_invitation_options_select_own" ON booking_invitation_options;


-- ============================================================================
-- supabase/migrations/0026_automation_log_onconflict_fix.sql
-- ============================================================================
-- Thryve Growth Co. — fix automation_log upsert idempotency (pre-existing bug)
--
-- Migration 0010 created the dedup index as PARTIAL:
--   CREATE UNIQUE INDEX automation_log_event_booking_uniq
--     ON automation_log(event_key, booking_id) WHERE booking_id IS NOT NULL;
-- But every caller upserts with `onConflict: "event_key,booking_id"`, i.e.
-- `ON CONFLICT (event_key, booking_id)` with no predicate. Postgres will NOT
-- infer a partial index from that, so the upsert errors with "no unique or
-- exclusion constraint matching the ON CONFLICT specification" and the write is
-- silently swallowed (errors are caught/ignored at every call site). Net effect:
-- the audit log never records reminder/calendar/email events, and sendTemplated's
-- idempotency dedup never fires.
--
-- Fix: make the index NON-partial so the conflict target matches. Behaviour is
-- preserved — rows with NULL booking_id stay non-unique (NULLS DISTINCT), exactly
-- as the partial index intended; only NOT-NULL pairs are deduped.

-- Drop any pre-existing duplicate (event_key, booking_id) pairs (keep the oldest)
-- so the unique index can be created. No-op if the log is empty/clean.
DELETE FROM automation_log a
USING automation_log b
WHERE a.ctid < b.ctid
  AND a.event_key = b.event_key
  AND a.booking_id = b.booking_id
  AND a.booking_id IS NOT NULL;

DROP INDEX IF EXISTS automation_log_event_booking_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS automation_log_event_booking_uniq
  ON automation_log(event_key, booking_id);


