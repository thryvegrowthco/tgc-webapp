-- 0019_job_sources.sql
--
-- Registry of automated job-feed sources, toggleable by Rachel in
-- /admin/integrations. The automated feed cron (/api/cron/job-feed) only pulls
-- from rows where enabled = TRUE and a matching adapter exists in
-- src/lib/job-api/sources.ts. job_listings.source stays free-text (no enum
-- change needed) — the `provider` here is the source key written to it.

CREATE TABLE IF NOT EXISTS job_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,   -- 'jsearch', 'usajobs', ...
  label TEXT NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_sources_admin" ON job_sources
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Seed the two adapters that ship today. JSearch is on (it already powered the
-- manual "Fetch from JSearch" button). USAJOBS is off until its API key is set.
INSERT INTO job_sources (provider, label, enabled, sort_order) VALUES
  ('jsearch', 'JSearch (LinkedIn / Indeed / ZipRecruiter / Google aggregate)', TRUE, 10),
  ('usajobs', 'USAJOBS.gov (federal government)', FALSE, 20)
ON CONFLICT (provider) DO NOTHING;
