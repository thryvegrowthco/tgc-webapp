-- 0015_tracking_pixels.sql
--
-- Visitor tracking + conversion pixels (GA4, GTM, Meta, Google Ads, LinkedIn
-- Insight, Microsoft Clarity), all configurable from /admin/integrations
-- without a deploy. Rachel pastes a pixel ID into the card, flips the toggle,
-- and the corresponding <Script> tag injects into the root layout on the next
-- render — but only after the visitor accepts the cookie consent banner.
--
-- Pixel IDs are NOT secrets (they appear in any page source the second the
-- script fires) so we don't encrypt them — they live in plain TEXT. Anonymous
-- reads are gated through RLS to only return rows that are both enabled AND
-- have a pixel_id set, so the public root layout never accidentally surfaces
-- "draft" state.

CREATE TABLE IF NOT EXISTS tracking_pixels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  id_placeholder TEXT,
  pixel_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tracking_pixels_active_idx
  ON tracking_pixels(sort_order, provider)
  WHERE enabled = TRUE AND pixel_id IS NOT NULL;

ALTER TABLE tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Public marketing site is anonymous — anyone can read rows that are live.
CREATE POLICY "tracking_pixels_select_active" ON tracking_pixels
  FOR SELECT USING (
    enabled = TRUE
    AND pixel_id IS NOT NULL
    AND length(trim(pixel_id)) > 0
  );

-- Admins have full read/write access (including draft/disabled rows).
CREATE POLICY "tracking_pixels_admin_all" ON tracking_pixels
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── Seed the 6 supported providers ──────────────────────────────────────────
-- Each row starts disabled with NULL pixel_id. Rachel pastes her IDs in
-- /admin/integrations and flips the toggle when ready. Order matches the
-- card ordering on the admin page.
INSERT INTO tracking_pixels (provider, name, description, id_placeholder, sort_order) VALUES
  ('google_analytics_4',  'Google Analytics 4',  'Core web analytics — page views, sessions, events, conversion funnels.',                                         'G-XXXXXXXXXX',     10),
  ('google_tag_manager',  'Google Tag Manager',  'Optional container that lets you add or swap pixels through the GTM UI without touching code.',                  'GTM-XXXXXXX',       20),
  ('meta_pixel',          'Meta Pixel',          'Facebook + Instagram ad tracking, retargeting audiences, and conversion attribution.',                            '1234567890123456',  30),
  ('google_ads',          'Google Ads',          'Conversion tracking for Google Ads campaigns. Paste the conversion ID (or full ID/label).',                       'AW-XXXXXXXXX',      40),
  ('linkedin_insight',    'LinkedIn Insight',    'Audience building and conversion tracking for LinkedIn ad campaigns. Paste your Partner ID.',                     '12345678',          50),
  ('microsoft_clarity',   'Microsoft Clarity',   'Free heatmaps and session recordings so you can see how visitors actually use the site.',                         'abc1234567',        60)
ON CONFLICT (provider) DO NOTHING;
