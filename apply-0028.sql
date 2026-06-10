-- Thryve Growth Co. — Phase 2: Quote → Proposal → Pay (consulting revenue)
--
-- HR consulting / recruitment / culture work is quote-based. Today a consultation
-- request goes to email + GoHighLevel only — there is no DB record, no in-app
-- accept, and no way to collect payment. This adds a proposal layer:
--
--   Rachel builds a proposal (scope/terms via the rich-text editor + a price) →
--   emails a branded token link → the client reviews it at a PUBLIC page →
--   accepts (types their name; we snapshot the terms + capture IP/timestamp, the
--   same immutable-signing pattern as signed_service_agreements) → pays via Stripe
--   Checkout (ad-hoc price_data, metadata.flow='proposal') → the webhook marks it
--   paid, records the payment, and alerts Rachel.
--
-- All additions are additive. Acceptance with a $0 amount is allowed (sign-only,
-- no checkout) so the same flow covers fixed-scope agreements without payment.

-- pgcrypto's gen_random_bytes() (used for the token default) lives in the
-- `extensions` schema on Supabase. The dashboard SQL Editor includes that schema
-- in its search_path, but `supabase db push` connects with a minimal one — so the
-- unqualified call resolves only when we add it here. Covers both public and
-- extensions placements; pg_catalog (gen_random_uuid) is always implicitly first.
SET search_path = public, extensions;

-- ─── proposals ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Public bearer token embedded in the email link. 16 random bytes → 32 hex.
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable: lead may have no account yet
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,       -- the consultation lead this converts, if any
  client_email TEXT NOT NULL,
  client_name TEXT,
  title TEXT NOT NULL,
  -- Short intro shown in the email + page header (plain text).
  summary TEXT,
  -- Scope / terms as Tiptap ProseMirror JSON (same format as blog + agreements).
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Optional display-only line-item breakdown: [{ description, amount_cents }].
  -- amount_cents below is the authoritative figure charged.
  line_items JSONB,
  amount_cents INT NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  service_type TEXT,
  requires_signature BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'paid', 'declined', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  internal_notes TEXT,            -- admin-only; never rendered to the client
  -- Stripe Checkout (idempotency + receipts).
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  -- Acceptance snapshot (immutable record, mirrors signed_service_agreements).
  accepted_at TIMESTAMPTZ,
  accepted_name TEXT,
  accepted_ip TEXT,
  accepted_snapshot JSONB,        -- copy of content at the moment of acceptance
  declined_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proposals_client_email_idx ON proposals(client_email);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_client_id_idx ON proposals(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposals_lead_id_idx ON proposals(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposals_expires_at_idx ON proposals(expires_at) WHERE expires_at IS NOT NULL;
-- One paid proposal per Checkout session (webhook idempotency).
CREATE UNIQUE INDEX IF NOT EXISTS proposals_stripe_session_key
  ON proposals(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Link a payment back to the proposal that produced it (Phase 5 LTV/funnel).
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS payments_proposal_id_idx ON payments(proposal_id) WHERE proposal_id IS NOT NULL;

-- ─── admin_notifications: widen type for proposal events ───────────────────────
ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check
  CHECK (
    type IN (
      'new_booking', 'intake_submitted', 'client_doc_upload', 'intake_overdue',
      'session_in_24h', 'new_subscriber', 'subscriber_unsubscribed',
      'subscriber_updated', 'new_subscription', 'subscription_issue',
      'watchlist_updated', 'application_status', 'client_message',
      'session_booked_via_invite',
      -- added 0028
      'proposal_accepted', 'proposal_paid'
    )
  );

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Admins manage everything.
CREATE POLICY "proposals_admin" ON proposals
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- A logged-in client can read proposals addressed to their account (so the
-- portal could surface one). The PUBLIC token page does NOT rely on RLS — it
-- uses the service client (the token is the bearer secret), exactly like the
-- booking-invitation page.
CREATE POLICY "proposals_select_own" ON proposals
  FOR SELECT USING (client_id = auth.uid() OR is_admin());

-- ─── Email template ───────────────────────────────────────────────────────────
-- Inner body HTML only; the brand shell is applied at render time. Keep in sync
-- with DEFAULT_TEMPLATES in src/lib/email/defaults.ts.
INSERT INTO email_templates (key, subject, body_html, placeholders, description) VALUES
  (
    'proposal_sent',
    'Your Proposal from Thryve Growth Co.',
    '<p style="margin:0 0 16px;">Hi {{client_name}},</p>
<p style="margin:0 0 16px;">Thank you for the conversation. I''ve put together a proposal outlining the scope, terms, and investment for working together. You can review the full details and accept it using the link below:</p>
{{#if custom_message}}<p style="margin:0 0 16px;color:#475569;">{{custom_message}}</p>{{/if}}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
  <tr><td style="padding:16px 18px;">
    <p style="margin:0 0 10px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;">Proposal</p>
    <p style="margin:0 0 6px;color:#0f172a;"><strong>{{proposal_title}}</strong></p>
    {{#if service_type}}<p style="margin:0 0 6px;color:#0f172a;"><strong>Service:</strong> {{service_type}}</p>{{/if}}
    {{#if amount_formatted}}<p style="margin:0;color:#0f172a;"><strong>Investment:</strong> {{amount_formatted}}</p>{{/if}}
  </td></tr>
</table>
<p style="margin:0 0 28px;text-align:center;">
  <a href="{{proposal_url}}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;">Review &amp; Accept Proposal</a>
</p>
{{#if expiry_note}}<p style="margin:0 0 16px;color:#475569;">{{expiry_note}}</p>{{/if}}
<p style="margin:0 0 16px;color:#475569;">If you have any questions or would like to adjust anything, just reply to this email and we''ll work it out together.</p>
<p style="margin:0;color:#475569;">Looking forward to partnering with you!<br/>— Rachel</p>',
    ARRAY['client_name','proposal_title','proposal_url','service_type','amount_formatted','custom_message','expiry_note'],
    'Sent to a prospect when Rachel sends a consulting proposal. CTA links to the public proposal page.'
  )
ON CONFLICT (key) DO NOTHING;
