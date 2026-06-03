-- Thryve Growth Co. — Service Booking + Client Onboarding Automation
--
-- Extends the existing booking flow with the full post-purchase journey:
-- receipt + welcome emails, service-specific intake forms, contract
-- acceptance audit, Google Meet links, status pipeline, reminder crons,
-- editable email templates, threaded messaging, and Google Calendar OAuth
-- token storage.
--
-- All additions are additive — existing rows and code paths continue to work.
--
-- Tables added:
--   intake_responses     — one row per booking; JSONB responses keyed by service_key
--   client_messages      — threaded client ↔ admin communication
--   email_templates      — admin-editable transactional templates (Handlebars syntax)
--   automation_log       — idempotency ledger for reminders / cron emails
--   admin_integrations   — OAuth tokens for Rachel's connected accounts (Google Calendar)
--
-- Bucket added:
--   client-uploads       — files the client uploads to Rachel (separate from `documents`)
--
-- Columns added to `bookings`:
--   stripe_session_id    — already exists; UNIQUE constraint added for webhook idempotency
--   service_key, contract_accepted_at, contract_version, workflow_status,
--   meet_link, calendar_event_id, meet_link_pending, session_at, intake_due_at,
--   completed_at, session_reminder_sent_at, prep_summary_sent_at, follow_up_sent_at

-- ─── Bookings: column additions ───────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_key TEXT,
  ADD COLUMN IF NOT EXISTS contract_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_version TEXT,
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'booked',
  ADD COLUMN IF NOT EXISTS meet_link TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS meet_link_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS intake_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prep_summary_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;

-- Backfill workflow_status for existing rows that are already confirmed/completed
UPDATE bookings SET workflow_status = 'completed' WHERE status = 'completed' AND workflow_status = 'booked';
UPDATE bookings SET workflow_status = 'cancelled' WHERE status = 'cancelled' AND workflow_status = 'booked';
UPDATE bookings SET workflow_status = 'session_scheduled' WHERE status = 'confirmed' AND workflow_status = 'booked';

-- Workflow status constraint (6 states + cancelled)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_workflow_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_workflow_status_check
  CHECK (workflow_status IN (
    'booked', 'intake_needed', 'intake_complete',
    'session_scheduled', 'completed', 'follow_up_sent', 'cancelled'
  ));

-- Idempotency: a Stripe session can only create one booking
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_id_key
  ON bookings(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Indexes for cron queries
CREATE INDEX IF NOT EXISTS bookings_workflow_status_idx ON bookings(workflow_status);
CREATE INDEX IF NOT EXISTS bookings_intake_due_at_idx ON bookings(intake_due_at) WHERE intake_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_session_at_idx ON bookings(session_at) WHERE session_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_completed_at_idx ON bookings(completed_at) WHERE completed_at IS NOT NULL;

-- ─── intake_responses ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intake_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT 'v1',
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS intake_responses_client_id_idx ON intake_responses(client_id);
CREATE INDEX IF NOT EXISTS intake_responses_submitted_at_idx ON intake_responses(submitted_at);

ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_responses_select_own" ON intake_responses
  FOR SELECT USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "intake_responses_insert_own" ON intake_responses
  FOR INSERT WITH CHECK (client_id = auth.uid() OR is_admin());
CREATE POLICY "intake_responses_update_own" ON intake_responses
  FOR UPDATE USING (client_id = auth.uid() OR is_admin());

-- ─── client_messages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'admin')),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  attachment_path TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_messages_thread_idx
  ON client_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_messages_unread_idx
  ON client_messages(client_id, read_at) WHERE read_at IS NULL;

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

-- Clients see only their own thread
CREATE POLICY "messages_select_own" ON client_messages
  FOR SELECT USING (client_id = auth.uid() OR is_admin());

-- Clients can post messages where they are the client + the sender
CREATE POLICY "messages_insert_client" ON client_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'client'
    AND client_id = auth.uid()
  );

-- Admins can post to any thread
CREATE POLICY "messages_insert_admin" ON client_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'admin'
    AND is_admin()
  );

-- Either party can mark messages as read in their own thread
CREATE POLICY "messages_update_read" ON client_messages
  FOR UPDATE USING (client_id = auth.uid() OR is_admin());

-- ─── email_templates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  placeholders TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_admin" ON email_templates
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed all 8 templates with starter copy. Rachel can edit any of these in
-- /admin/templates. The `body_html` content is the INNER body only; the
-- email shell (brand header + cream card + footer) is applied at render time.
INSERT INTO email_templates (key, subject, body_html, placeholders, description) VALUES
  (
    'receipt',
    'Your receipt from Thryve Growth Co.',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for your payment. Here are the details for your records:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{service_type}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{amount_formatted}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{payment_date}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;">{{transaction_id}}</td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">A separate welcome email is on its way with next steps.</p>
<p style="margin:0;color:#475569;">Questions? Reply to this email or write to <a href="mailto:hello@thryvegrowth.co" style="color:#203e35;">hello@thryvegrowth.co</a>.</p>',
    ARRAY['client_name','service_type','amount_formatted','payment_date','transaction_id'],
    'Sent immediately after Stripe checkout completes. Transactional, minimal.'
  ),
  (
    'welcome',
    'Welcome to Thryve Growth Co. — here''s what comes next',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thank you so much for booking <strong>{{service_type}}</strong>. I''m excited to support you.</p>
<p style="margin:0 0 24px;">Before we get started, here''s how the next few days will go:</p>
<ol style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 12px;"><strong>Complete your intake form</strong> by {{intake_due_date}}. It takes about 5 minutes and helps me make our time together as valuable as possible.</li>
  <li style="margin:0 0 12px;"><strong>Upload any materials</strong> (resume, job posting, current cover letter) so I can review them in advance.</li>
  <li style="margin:0 0 12px;"><strong>Open your session workspace</strong> for the meeting link, prep guidance, and a place to message me directly.</li>
</ol>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your session workspace</a>
</p>
<p style="margin:0 0 16px;color:#475569;"><strong>Need to reschedule?</strong> Reply to this email at least 24 hours before our session and we''ll find a new time. Cancellations within 24 hours are non-refundable.</p>
<p style="margin:0;color:#475569;">Direct. Honest. Practical.<br/>— Rachel</p>',
    ARRAY['client_name','service_type','intake_due_date','session_workspace_url','session_date','meet_link'],
    'Warm welcome with next steps. Sent right after the receipt.'
  ),
  (
    'intake_reminder_48h',
    'Quick reminder: your intake form for {{service_type}}',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Just a friendly nudge — your intake form for our upcoming {{service_type}} is due in 48 hours. It takes about 5 minutes.</p>
<p style="margin:0 0 16px;">The more you share, the more we can get done together.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Complete your intake</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','service_type','session_workspace_url'],
    'Sent 48 hours before session_at if intake still incomplete.'
  ),
  (
    'intake_reminder_24h',
    'One more nudge — your intake form for {{service_type}}',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">We''re meeting tomorrow at {{session_time}}. I want to make sure I''m as prepared as possible — the more I know going in, the more we can get done together.</p>
<p style="margin:0 0 16px;">Could you take 5 minutes to fill out the intake form?</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Complete your intake</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','service_type','session_time','session_workspace_url'],
    'Sent 24 hours before session_at if intake still incomplete.'
  ),
  (
    'intake_complete',
    'Got it — I''ll review before we meet',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for completing your intake form. I''ll review everything carefully before we meet on <strong>{{session_date}} at {{session_time}}</strong>.</p>
<p style="margin:0 0 16px;">A few things to think about before we connect:</p>
<ul style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 8px;">What does a successful session look like for you?</li>
  <li style="margin:0 0 8px;">What''s the one thing you''d most like to walk away with?</li>
</ul>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your session workspace</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','session_date','session_time','session_workspace_url'],
    'Sent immediately after intake form is submitted.'
  ),
  (
    'session_reminder_24h',
    'We''re meeting tomorrow at {{session_time}}',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Looking forward to our session tomorrow.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f5ece3;border-radius:8px;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">When</p>
    <p style="margin:0 0 16px;color:#0f172a;font-weight:600;">{{session_date}} at {{session_time}} (CT)</p>
    <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Join via</p>
    <p style="margin:0;"><a href="{{meet_link}}" style="color:#203e35;font-weight:600;text-decoration:none;">{{meet_link}}</a></p>
  </td></tr>
</table>
<p style="margin:0 0 16px;color:#475569;">If something came up, reply to this email and we''ll find a new time.</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','session_date','session_time','meet_link','session_workspace_url'],
    'Sent 24 hours before session_at.'
  ),
  (
    'post_service_followup',
    'How''d it go? A few next steps from our session',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Hope our recent {{service_type}} was useful. Here are three things to keep momentum:</p>
<ol style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 12px;"><strong>Review what we covered</strong> — any notes or materials I shared are in your <a href="{{session_workspace_url}}" style="color:#203e35;">session workspace</a>.</li>
  <li style="margin:0 0 12px;"><strong>Share a quick testimonial</strong> if it''s been helpful — it takes about 60 seconds and means a lot. <a href="{{testimonial_url}}" style="color:#203e35;">Leave one here.</a></li>
  <li style="margin:0 0 12px;"><strong>Need another session?</strong> <a href="{{book_url}}" style="color:#203e35;">Book it here</a> while it''s top of mind.</li>
</ol>
<p style="margin:0 0 16px;color:#475569;">Direct. Honest. Practical.</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','service_type','session_workspace_url','testimonial_url','book_url'],
    'Sent 24 hours after the booking is marked completed.'
  ),
  (
    'deliverable_ready',
    'Your {{deliverable_type}} is ready',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your <strong>{{deliverable_type}}</strong> is ready and waiting in your Thryve dashboard.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{deliverable_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your dashboard</a>
</p>
<p style="margin:0 0 16px;color:#475569;">Let me know if you have any questions.</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','deliverable_type','deliverable_url'],
    'Manually triggered from admin when a resume rewrite or HR project deliverable is uploaded.'
  )
ON CONFLICT (key) DO NOTHING;

-- ─── automation_log ───────────────────────────────────────────────────────────
-- Idempotency ledger. Every reminder / cron email writes a row here BEFORE
-- sending; UNIQUE (event_key, booking_id) prevents duplicate sends on retry.
CREATE TABLE IF NOT EXISTS automation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The UNIQUE pair is what makes retries safe — upsert on conflict do nothing.
CREATE UNIQUE INDEX IF NOT EXISTS automation_log_event_booking_uniq
  ON automation_log(event_key, booking_id) WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS automation_log_event_key_idx ON automation_log(event_key);
CREATE INDEX IF NOT EXISTS automation_log_created_at_idx ON automation_log(created_at DESC);

ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_log_admin" ON automation_log
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── admin_integrations ───────────────────────────────────────────────────────
-- Stores encrypted OAuth tokens for Rachel's connected services.
-- Currently used for Google Calendar (Meet link generation on booking).
CREATE TABLE IF NOT EXISTS admin_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  account_email TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_integrations ENABLE ROW LEVEL SECURITY;
-- Only admins can read; tokens stay encrypted at rest even when read.
CREATE POLICY "admin_integrations_admin" ON admin_integrations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── client-uploads storage bucket ────────────────────────────────────────────
-- Distinct from the existing `documents` bucket (which is admin → client).
-- This is client → admin: resumes, cover letters, HR docs uploaded via intake.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-uploads',
  'client-uploads',
  false,
  26214400,  -- 25 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Clients can upload + read their own files (path prefix {userId}/...)
CREATE POLICY "Clients can upload to own folder in client-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Clients can read own files in client-uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can do everything in client-uploads
CREATE POLICY "Admins can manage client-uploads"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'client-uploads'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
