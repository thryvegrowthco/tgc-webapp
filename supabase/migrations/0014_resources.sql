-- 0014_resources.sql
--
-- The /resources marketing page previously hardcoded 8 placeholder templates +
-- worksheets that Rachel hadn't built yet. Their Buy/Download buttons led
-- nowhere. This migration moves the catalog into Postgres so Rachel can:
--
--   • toggle individual resources on/off without a deploy
--   • edit copy (title, description, price, category, cta_type) from /admin/resources
--
-- All 8 rows seed with enabled = FALSE so the launch state is "Resources coming
-- soon" — the public page shows a centered empty-state panel until Rachel
-- flips the first switch. The Buy/Download button is replaced with a muted
-- "Coming soon" badge until URL wiring is added in a follow-up.

CREATE TABLE IF NOT EXISTS resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  cta_type TEXT NOT NULL CHECK (cta_type IN ('Buy Now', 'Download')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resources_enabled_sort_idx
  ON resources(sort_order, title) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS resources_sort_idx ON resources(sort_order, title);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Public marketing page is anonymous — anyone can read enabled rows.
CREATE POLICY "resources_select_enabled" ON resources
  FOR SELECT USING (enabled = TRUE);

-- Admins can read all rows (including disabled) + write.
CREATE POLICY "resources_admin_all" ON resources
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── Seed the 8 existing resources ────────────────────────────────────────────
-- Titles, descriptions, prices, and cta_type match the hardcoded array that
-- used to live in src/app/(marketing)/resources/page.tsx. All start disabled.
INSERT INTO resources (slug, category, title, description, price, cta_type, enabled, sort_order) VALUES
  ('resume-template-pack',         'Career & Job Search',     'Resume Template Pack',         'Three clean, modern resume templates designed for clarity and easy customization.',                 '$19',  'Buy Now',  FALSE, 10),
  ('cover-letter-starter-kit',     'Career & Job Search',     'Cover Letter Starter Kit',     'A simple framework plus three editable examples for different career moments.',                     '$15',  'Buy Now',  FALSE, 20),
  ('interview-prep-workbook',      'Career & Job Search',     'Interview Prep Workbook',      'STAR method guidance, common questions, and space to draft your strongest answers.',                'Free', 'Download', FALSE, 30),
  ('career-vision-worksheet',      'Leadership & Coaching',   'Career Vision Worksheet',      'A reflection guide to help you get clear on what you want and what''s getting in the way.',        'Free', 'Download', FALSE, 40),
  ('first-90-days-leadership',     'Leadership & Coaching',   'First 90 Days Leadership Plan','A structured template for new leaders stepping into a role with intention.',                         '$25',  'Buy Now',  FALSE, 50),
  ('onboarding-checklist',         'HR & Team Operations',    'Onboarding Checklist Template','A simple, repeatable onboarding flow that helps new hires feel set up for success.',                 '$19',  'Buy Now',  FALSE, 60),
  ('performance-review-toolkit',   'HR & Team Operations',    'Performance Review Toolkit',   'Review templates, prep prompts, and conversation guides for honest, useful reviews.',               '$29',  'Buy Now',  FALSE, 70),
  ('team-values-worksheet',        'HR & Team Operations',    'Team Values Worksheet',        'A guided exercise for naming the values your team actually wants to live by.',                       'Free', 'Download', FALSE, 80)
ON CONFLICT (slug) DO NOTHING;
