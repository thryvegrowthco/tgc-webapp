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
