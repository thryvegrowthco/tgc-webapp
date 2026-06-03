-- Thryve Growth Co. — Newsletter + content automation system
--
-- Adds the full subscriber journey on top of the existing newsletter_subscribers
-- table: interest tagging, welcome flow, weekly issue authoring with
-- draft/preview/approval, scheduled send via Vercel Cron, Resend webhook
-- tracking, re-engagement, milestones, and reusable templates.
--
-- Tables added:
--   newsletter_issues       — one row per weekly issue (draft → sent)
--   newsletter_templates    — reusable section layouts
--   newsletter_sends        — per-recipient ledger (correlates webhook events)
--   newsletter_events       — raw Resend webhook events (idempotent on resend_event_id)
--   newsletter_ideas        — quick capture for Rachel's content ideas
--
-- Views added:
--   newsletter_issue_stats  — aggregated open/click counts per issue
--   newsletter_top_links    — most-clicked URLs per issue
--
-- All tables use the same `is_admin()` RLS pattern as existing schema (0001).
-- Public subscribe / unsubscribe paths use the service-role client and bypass RLS.

-- ─── Extend newsletter_subscribers ────────────────────────────────────────────
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_engaged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;

-- Backfill tokens for any existing rows, then make NOT NULL + UNIQUE
UPDATE newsletter_subscribers
SET unsubscribe_token = encode(gen_random_bytes(16), 'hex')
WHERE unsubscribe_token IS NULL;

ALTER TABLE newsletter_subscribers
  ALTER COLUMN unsubscribe_token SET NOT NULL,
  ALTER COLUMN unsubscribe_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_unsubscribe_token_key
  ON newsletter_subscribers(unsubscribe_token);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_interests_idx
  ON newsletter_subscribers USING GIN (interests);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_engagement_idx
  ON newsletter_subscribers(last_engaged_at DESC NULLS LAST);

-- ─── newsletter_templates ─────────────────────────────────────────────────────
CREATE TABLE newsletter_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one default at a time (enforced by partial unique index)
CREATE UNIQUE INDEX newsletter_templates_one_default_idx
  ON newsletter_templates(is_default) WHERE is_default = TRUE;

ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_templates_admin" ON newsletter_templates
  FOR ALL USING (is_admin());

-- ─── newsletter_issues ────────────────────────────────────────────────────────
CREATE TABLE newsletter_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  template_id UUID REFERENCES newsletter_templates(id) ON DELETE SET NULL,
  target_interests TEXT[] NOT NULL DEFAULT '{}',
  featured_blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX newsletter_issues_status_scheduled_idx
  ON newsletter_issues(status, scheduled_for);
CREATE INDEX newsletter_issues_created_at_idx
  ON newsletter_issues(created_at DESC);

ALTER TABLE newsletter_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_issues_admin" ON newsletter_issues
  FOR ALL USING (is_admin());

-- ─── newsletter_sends ─────────────────────────────────────────────────────────
-- Per-recipient ledger. Stores Resend message id so webhook events can be
-- correlated back to the issue + subscriber.
CREATE TABLE newsletter_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  resend_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'bounced')),
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX newsletter_sends_message_id_idx
  ON newsletter_sends(resend_message_id) WHERE resend_message_id IS NOT NULL;
CREATE INDEX newsletter_sends_issue_idx ON newsletter_sends(issue_id);
CREATE INDEX newsletter_sends_subscriber_idx ON newsletter_sends(subscriber_id);

ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_sends_admin" ON newsletter_sends
  FOR ALL USING (is_admin());

-- ─── newsletter_events ────────────────────────────────────────────────────────
-- Raw Resend webhook events. UNIQUE(resend_event_id) makes the handler
-- idempotent under retries.
CREATE TABLE newsletter_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID REFERENCES newsletter_sends(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES newsletter_issues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  )),
  url TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  resend_event_id TEXT UNIQUE
);

CREATE INDEX newsletter_events_issue_type_idx
  ON newsletter_events(issue_id, event_type);
CREATE INDEX newsletter_events_subscriber_time_idx
  ON newsletter_events(subscriber_id, occurred_at DESC);

ALTER TABLE newsletter_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_events_admin" ON newsletter_events
  FOR ALL USING (is_admin());

-- ─── newsletter_ideas ─────────────────────────────────────────────────────────
-- Lightweight idea inbox for Rachel.
CREATE TABLE newsletter_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body TEXT NOT NULL,
  used_in_issue_id UUID REFERENCES newsletter_issues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE newsletter_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_ideas_admin" ON newsletter_ideas
  FOR ALL USING (is_admin());

-- ─── Aggregate views ──────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW newsletter_issue_stats AS
SELECT
  i.id AS issue_id,
  i.title,
  i.subject,
  i.sent_at,
  i.sent_count,
  COALESCE(SUM(CASE WHEN e.event_type = 'delivered' THEN 1 ELSE 0 END), 0)::INT AS delivered,
  COALESCE(SUM(CASE WHEN e.event_type = 'opened'    THEN 1 ELSE 0 END), 0)::INT AS opened,
  COALESCE(SUM(CASE WHEN e.event_type = 'clicked'   THEN 1 ELSE 0 END), 0)::INT AS clicked,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'opened'  THEN e.subscriber_id END), 0)::INT AS unique_opens,
  COALESCE(COUNT(DISTINCT CASE WHEN e.event_type = 'clicked' THEN e.subscriber_id END), 0)::INT AS unique_clicks,
  COALESCE(SUM(CASE WHEN e.event_type = 'bounced'    THEN 1 ELSE 0 END), 0)::INT AS bounces,
  COALESCE(SUM(CASE WHEN e.event_type = 'complained' THEN 1 ELSE 0 END), 0)::INT AS complaints
FROM newsletter_issues i
LEFT JOIN newsletter_events e ON e.issue_id = i.id
GROUP BY i.id;

CREATE OR REPLACE VIEW newsletter_top_links AS
SELECT
  issue_id,
  url,
  COUNT(*)::INT AS click_count
FROM newsletter_events
WHERE event_type = 'clicked' AND url IS NOT NULL
GROUP BY issue_id, url
ORDER BY click_count DESC;

-- ─── Seed: default 7-section template ─────────────────────────────────────────
-- Tiptap ProseMirror JSON. Each section is an h2 heading + empty paragraph so
-- Rachel sees the structure when she opens a new issue. Matches the layout in
-- the master prompt: opening, motivation, featured blog, tip, resource,
-- service highlight, closing.
INSERT INTO newsletter_templates (name, description, content, is_default) VALUES (
  'Weekly Default',
  'The standard Thryve weekly structure: opening, motivation, featured blog, tip, resource, service, closing.',
  $$
  {
    "type": "doc",
    "content": [
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Opening Note from Rachel" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Weekly Motivation" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Featured Blog or Article" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Career or Leadership Tip" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Resource Spotlight" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Service or Offering Highlight" }] },
      { "type": "paragraph" },
      { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Closing Thought" }] },
      { "type": "paragraph" }
    ]
  }
  $$::jsonb,
  TRUE
);
