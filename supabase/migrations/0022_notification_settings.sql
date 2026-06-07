-- 0022_notification_settings.sql
--
-- Admin-toggleable on/off switches for every (non-critical) notification, per
-- channel (email / in-app bell), for both audiences (admin and client/lead).
-- Read by src/lib/notifications/settings.ts and enforced inside the notification
-- helpers + direct send-sites. Default: everything ON (behavior unchanged).
--
-- Key convention: "<audience>_<channel>:<event>", e.g. admin_email:new_subscriber.
-- Master switches: admin_all, client_all (channel 'all').
-- "Must-send" messages (receipts, booking/subscription welcome, intake_complete,
-- deliverable_ready, client session_reminder_24h, auth emails, the newsletter
-- issue itself) are intentionally NOT seeded — with no row they can never be
-- disabled (the gate only suppresses a key that exists AND is disabled).

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  audience TEXT NOT NULL CHECK (audience IN ('admin', 'client')),
  event TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'bell', 'all')),
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_settings_disabled_idx
  ON notification_settings(key) WHERE enabled = FALSE;

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_settings_admin" ON notification_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO notification_settings (key, audience, event, channel, label, description, sort_order) VALUES
  -- Master switches
  ('admin_all',  'admin',  'all', 'all', 'All admin notifications',        'Master switch — turn off to silence every alert to you.', 0),
  ('client_all', 'client', 'all', 'all', 'All client & lead notifications', 'Master switch — turn off to silence every client/lead notification.', 0),

  -- ── Admin: email-only ──
  ('admin_email:contact_form',        'admin', 'contact_form',        'email', 'Contact form submission', 'Website contact form.', 10),
  ('admin_email:consultation_request','admin', 'consultation_request','email', 'Free consultation request', 'Consultation request form.', 11),
  ('admin_email:job_watchlist_lead',  'admin', 'job_watchlist_lead',  'email', 'Job watchlist lead', 'New lead from /services/job-alerts.', 12),
  ('admin_email:newsletter_feedback', 'admin', 'newsletter_feedback', 'email', 'Newsletter unsubscribe feedback', 'Feedback left on the unsubscribe page.', 13),

  -- ── Admin: email + bell ──
  ('admin_email:new_subscriber',          'admin', 'new_subscriber',          'email', 'New newsletter subscriber', 'Someone joined the newsletter.', 20),
  ('admin_bell:new_subscriber',           'admin', 'new_subscriber',          'bell',  'New newsletter subscriber', 'Someone joined the newsletter.', 20),
  ('admin_email:subscriber_unsubscribed', 'admin', 'subscriber_unsubscribed', 'email', 'Newsletter unsubscribe', 'Someone unsubscribed.', 21),
  ('admin_bell:subscriber_unsubscribed',  'admin', 'subscriber_unsubscribed', 'bell',  'Newsletter unsubscribe', 'Someone unsubscribed.', 21),
  ('admin_email:subscriber_updated',      'admin', 'subscriber_updated',      'email', 'Newsletter preferences updated', 'A subscriber changed preferences.', 22),
  ('admin_bell:subscriber_updated',       'admin', 'subscriber_updated',      'bell',  'Newsletter preferences updated', 'A subscriber changed preferences.', 22),
  ('admin_email:new_booking',             'admin', 'new_booking',             'email', 'New booking', 'A client booked a paid service.', 23),
  ('admin_bell:new_booking',              'admin', 'new_booking',             'bell',  'New booking', 'A client booked a paid service.', 23),
  ('admin_email:new_subscription',        'admin', 'new_subscription',        'email', 'New Job Alerts subscription', 'A client subscribed to Job Alerts.', 24),
  ('admin_bell:new_subscription',         'admin', 'new_subscription',        'bell',  'New Job Alerts subscription', 'A client subscribed to Job Alerts.', 24),
  ('admin_email:subscription_issue',      'admin', 'subscription_issue',      'email', 'Subscription issue', 'Cancellation, pause, or failed payment.', 25),
  ('admin_bell:subscription_issue',       'admin', 'subscription_issue',      'bell',  'Subscription issue', 'Cancellation, pause, or failed payment.', 25),
  ('admin_email:intake_submitted',        'admin', 'intake_submitted',        'email', 'Intake submitted', 'A client completed their intake.', 26),
  ('admin_bell:intake_submitted',         'admin', 'intake_submitted',        'bell',  'Intake submitted', 'A client completed their intake.', 26),
  ('admin_bell:client_doc_upload',        'admin', 'client_doc_upload',       'bell',  'Client document upload', 'A client uploaded a file with intake.', 27),
  ('admin_email:session_in_24h',          'admin', 'session_in_24h',          'email', 'Session reminders', 'Pre-session prep summary (T-2h).', 28),
  ('admin_bell:session_in_24h',           'admin', 'session_in_24h',          'bell',  'Session reminders', 'Upcoming session (T-24h).', 28),
  ('admin_email:intake_overdue',          'admin', 'intake_overdue',          'email', 'Intake overdue', 'Daily digest of overdue intakes.', 29),
  ('admin_bell:intake_overdue',           'admin', 'intake_overdue',          'bell',  'Intake overdue', 'Overdue intake alert.', 29),
  ('admin_email:watchlist_updated',       'admin', 'watchlist_updated',       'email', 'Client edited watchlist', 'A client changed their watchlist criteria.', 30),
  ('admin_bell:watchlist_updated',        'admin', 'watchlist_updated',       'bell',  'Client edited watchlist', 'A client changed their watchlist criteria.', 30),
  ('admin_email:application_status',       'admin', 'application_status',      'email', 'Application status change', 'A client moved an application forward.', 31),
  ('admin_bell:application_status',        'admin', 'application_status',      'bell',  'Application status change', 'A client moved an application forward.', 31),
  ('admin_email:client_message',          'admin', 'client_message',          'email', 'New message from client', 'A client sent you a message.', 32),
  ('admin_bell:client_message',           'admin', 'client_message',          'bell',  'New message from client', 'A client sent you a message.', 32),

  -- ── Client / lead: email-only ──
  ('client_email:lead_thankyou',          'client', 'lead_thankyou',          'email', 'Lead thank-you auto-reply', 'Auto-reply to a job-watchlist lead.', 200),
  ('client_email:consultation_autoreply', 'client', 'consultation_autoreply', 'email', 'Consultation auto-reply', 'Auto-reply confirming a consultation request.', 201),
  ('client_email:newsletter_welcome',     'client', 'newsletter_welcome',     'email', 'Newsletter welcome', 'Welcome email on newsletter signup.', 202),
  ('client_email:curated_job_match_email','client', 'curated_job_match',      'email', 'Curated job pick', 'Email when Rachel hand-picks a job.', 205),
  ('client_email:post_service_followup',  'client', 'post_service_followup',  'email', 'Post-service follow-up', 'Follow-up after a completed session.', 208),
  ('client_email:intake_reminder_48h',    'client', 'intake_reminder_48h',    'email', 'Intake reminder (48h)', 'Nudge to complete intake 48h before session.', 209),
  ('client_email:intake_reminder_24h',    'client', 'intake_reminder_24h',    'email', 'Intake reminder (24h)', 'Final nudge to complete intake 24h before session.', 210),

  -- ── Client / lead: email + bell ──
  ('client_email:new_job_match',      'client', 'new_job_match',      'email', 'New job matches', 'Email when new matches are added.', 203),
  ('client_bell:new_job_match',       'client', 'new_job_match',      'bell',  'New job matches', 'Bell when new matches are added.', 203),
  ('client_bell:curated_job_match',   'client', 'curated_job_match',  'bell',  'Curated job pick', 'Bell when Rachel hand-picks a job.', 205),
  ('client_email:watchlist_updated',  'client', 'watchlist_updated',  'email', 'Watchlist updated confirmation', 'Confirms the client''s preference change.', 206),
  ('client_bell:watchlist_updated',   'client', 'watchlist_updated',  'bell',  'Watchlist updated confirmation', 'Confirms the client''s preference change.', 206),
  ('client_email:application_reminder','client', 'application_reminder','email', 'Application reminders', 'T+7/14/30 nudges after applying.', 207),
  ('client_bell:application_reminder', 'client', 'application_reminder','bell',  'Application reminders', 'T+7/14/30 nudges after applying.', 207),
  ('client_email:message_received',   'client', 'message_received',   'email', 'Message from Rachel', 'Email when Rachel replies.', 204),
  ('client_bell:message_received',    'client', 'message_received',   'bell',  'Message from Rachel', 'Bell when Rachel replies.', 204)
ON CONFLICT (key) DO NOTHING;
