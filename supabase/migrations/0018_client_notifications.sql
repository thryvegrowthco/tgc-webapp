-- 0018_client_notifications.sql
--
-- Adds the client-facing notification system (mirrors admin_notifications,
-- which only ever surfaced events to Rachel). One row per notable event a
-- client should see in-app via a dashboard bell. Writes go through the
-- service-role client (see src/lib/notifications/client.ts), so RLS only needs
-- to let clients read + mark-read their own rows.
--
-- Also seeds the four transactional email templates that pair with these
-- in-app notifications. Body is the INNER html only; the brand shell is applied
-- at render time by sendTemplated (src/lib/email/render.ts), and {{#if}}
-- conditionals are supported by interpolate().

-- ─── client_notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'new_job_match',
      'curated_job_match',
      'watchlist_updated',
      'application_reminder',
      'message_received'
    )
  ),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  related_match_id UUID REFERENCES client_job_matches(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_notifications_unread_idx
  ON client_notifications(client_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS client_notifications_client_idx
  ON client_notifications(client_id, created_at DESC);

ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Clients read + mark-read their own; admins can read all. Writes use the
-- service-role client, which bypasses RLS.
CREATE POLICY "client_notifications_select_own"
  ON client_notifications FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "client_notifications_update_own"
  ON client_notifications FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "client_notifications_admin_select"
  ON client_notifications FOR SELECT
  TO authenticated
  USING (is_admin());

-- ─── Email template seeds ────────────────────────────────────────────────────
INSERT INTO email_templates (key, subject, body_html, placeholders, description) VALUES
  (
    'new_job_match',
    'New job matches in your Thryve watchlist',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Good news — <strong>{{match_count}}</strong> new job match{{#if match_plural}}es{{/if}} just landed in your watchlist based on your preferences.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Review your matches</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','match_count','match_plural','dashboard_url']::text[],
    'Sent when new auto-matched jobs are assigned to a client''s watchlist.'
  ),
  (
    'curated_job_match',
    'Rachel picked a job for you',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">I personally found a role I think is worth a look:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 4px;font-weight:600;font-size:16px;color:#0f172a;">{{job_title}}</p>
    <p style="margin:0 0 12px;color:#64748b;">{{company}}</p>
    {{#if match_reason}}<p style="margin:0 0 8px;color:#0f172a;"><strong>Why it matches:</strong> {{match_reason}}</p>{{/if}}
    {{#if recommended_action}}<p style="margin:0;color:#0f172a;"><strong>Recommended next step:</strong> {{recommended_action}}</p>{{/if}}
  </td></tr>
</table>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">View this match</a>
</p>
<p style="margin:0;color:#475569;">Direct. Honest. Practical.<br/>— Rachel</p>',
    ARRAY['client_name','job_title','company','match_reason','recommended_action','dashboard_url']::text[],
    'Sent when Rachel manually curates + assigns a job to a client.'
  ),
  (
    'watchlist_updated',
    'Your Thryve watchlist preferences were updated',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Your watchlist preferences were just updated. Future job searches will use your latest criteria.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#ffffff;color:#203e35;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;border:1px solid #203e35;">View your watchlist</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','dashboard_url']::text[],
    'Confirmation sent when a watchlist profile is saved/changed.'
  ),
  (
    'application_reminder',
    'How''s your application going?',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">It''s been a little while since you applied to <strong>{{job_title}}</strong> at {{company}} ({{applied_date}}). Any movement? Update your tracker so we can plan next steps together.</p>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{dashboard_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Update your tracker</a>
</p>
<p style="margin:0;color:#475569;">— Rachel</p>',
    ARRAY['client_name','job_title','company','applied_date','dashboard_url']::text[],
    'Follow-up nudge sent N days after a client marks a match as applied.'
  )
ON CONFLICT (key) DO NOTHING;
