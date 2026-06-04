-- 0013_admin_ops.sql
--
-- Closes the remaining master-spec gaps surfaced in /Users/dietz/.claude/plans/
-- we-ve-made-quite-a-drifting-corbato.md:
--
--   1. Expands documents.category to cover Rachel's deliverable categories
--      (resume_rewrite, hr_doc, deliverable) so the auto-notify on upload can
--      key off the saved row.
--   2. Adds admin_notifications — the in-app bell/inbox feed that mirrors
--      Rachel's email-only alerts so she stops triaging her inbox.
--   3. Adds admin_tasks — Rachel's lightweight to-do list, with a unique
--      partial index to make the auto-created "Review intake" task idempotent.
--   4. Re-seeds the receipt + welcome email templates with new placeholders so
--      receipts show the payment method + Stripe receipt URL and the welcome
--      email links to the client's signed service agreement.

-- ─── 1. Expand documents.category ────────────────────────────────────────────
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE documents ADD CONSTRAINT documents_category_check
  CHECK (
    category IN (
      'resume',
      'cover_letter',
      'notes',
      'worksheet',
      'template',
      'deliverable',
      'resume_rewrite',
      'hr_doc',
      'other'
    )
  );

-- ─── 2. admin_notifications ──────────────────────────────────────────────────
-- One row per notable event Rachel should see. Created alongside the existing
-- email alerts; the bell + /admin/notifications inbox surface them in-app.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (
    type IN (
      'new_booking',
      'intake_submitted',
      'client_doc_upload',
      'intake_overdue',
      'session_in_24h'
    )
  ),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON admin_notifications(created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_notifications_created_idx
  ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_notifications_admin" ON admin_notifications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── 3. admin_tasks ──────────────────────────────────────────────────────────
-- Rachel's to-do list. Tasks can optionally be tied to a booking or client so
-- they surface in those contexts as well as the global /admin/tasks page.
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  related_client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_tasks_open_idx
  ON admin_tasks(due_at NULLS LAST) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS admin_tasks_client_idx
  ON admin_tasks(related_client_id, completed_at)
  WHERE related_client_id IS NOT NULL;

-- The Stripe webhook auto-creates "Review intake when submitted" once per
-- booking. This partial unique index makes ON CONFLICT DO NOTHING work without
-- another idempotency log row.
CREATE UNIQUE INDEX IF NOT EXISTS admin_tasks_auto_review_uniq
  ON admin_tasks(related_booking_id)
  WHERE title = 'Review intake when submitted';

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_tasks_admin" ON admin_tasks
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── 4. Email template seed updates ──────────────────────────────────────────
-- Receipt — adds payment method summary, Stripe receipt URL, and support
-- contact placeholders. The webhook now expands the PaymentIntent to fill
-- these. The conditional rows render empty when a value is missing thanks to
-- the {{#if}} support added to interpolate() in src/lib/email/render.ts.
UPDATE email_templates
SET
  body_html = $$<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thanks for your payment. Here are the details for your records:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
  <tr><td style="padding:8px 0;color:#64748b;">Service</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{service_type}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-weight:600;">{{amount_formatted}}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{payment_date}}</td></tr>
  {{#if card_last4}}<tr><td style="padding:8px 0;color:#64748b;">Paid with</td><td style="padding:8px 0;text-align:right;color:#0f172a;">{{card_brand}} ending in {{card_last4}}</td></tr>{{/if}}
  <tr><td style="padding:8px 0;color:#64748b;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;">{{transaction_id}}</td></tr>
</table>
{{#if stripe_receipt_url}}<p style="margin:0 0 24px;text-align:center;">
  <a href="{{stripe_receipt_url}}" style="display:inline-block;background:#ffffff;color:#203e35;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;border:1px solid #203e35;">View Stripe receipt</a>
</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;">A separate welcome email is on its way with next steps.</p>
<p style="margin:0;color:#475569;">Questions? Reply to this email or write to <a href="mailto:{{support_email}}" style="color:#203e35;">{{support_email}}</a>.</p>$$,
  placeholders = ARRAY[
    'client_name',
    'service_type',
    'amount_formatted',
    'payment_date',
    'transaction_id',
    'card_brand',
    'card_last4',
    'stripe_receipt_url',
    'support_email'
  ]::text[],
  updated_at = NOW()
WHERE key = 'receipt';

-- Welcome — adds an optional "Your signed service agreement is on file" line
-- pointing at /dashboard/legal/signed/{id}. The {{#if}} block hides the line
-- when the client booked without a fresh signed agreement (rare, but safe).
UPDATE email_templates
SET
  body_html = $$<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thank you so much for booking <strong>{{service_type}}</strong>. I'm excited to support you.</p>
<p style="margin:0 0 24px;">Before we get started, here's how the next few days will go:</p>
<ol style="margin:0 0 24px;padding-left:20px;color:#0f172a;">
  <li style="margin:0 0 12px;"><strong>Complete your intake form</strong> by {{intake_due_date}}. It takes about 5 minutes and helps me make our time together as valuable as possible.</li>
  <li style="margin:0 0 12px;"><strong>Upload any materials</strong> (resume, job posting, current cover letter) so I can review them in advance.</li>
  <li style="margin:0 0 12px;"><strong>Open your session workspace</strong> for the meeting link, prep guidance, and a place to message me directly.</li>
</ol>
<p style="margin:0 0 32px;text-align:center;">
  <a href="{{session_workspace_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Open your session workspace</a>
</p>
{{#if signed_agreement_url}}<p style="margin:0 0 16px;color:#475569;">Your signed service agreement is <a href="{{signed_agreement_url}}" style="color:#203e35;">on file here</a> for your records.</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;"><strong>Need to reschedule?</strong> Reply to this email at least 24 hours before our session and we'll find a new time. Cancellations within 24 hours are non-refundable.</p>
<p style="margin:0;color:#475569;">Direct. Honest. Practical.<br/>— Rachel</p>$$,
  placeholders = ARRAY[
    'client_name',
    'service_type',
    'intake_due_date',
    'session_workspace_url',
    'session_date',
    'meet_link',
    'signed_agreement_url'
  ]::text[],
  updated_at = NOW()
WHERE key = 'welcome';
