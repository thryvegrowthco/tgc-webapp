-- 0030_resource_files_and_tracking.sql
--
-- Phase 3: make free resources actually downloadable, and track how many people
-- REVIEWED (viewed) and DOWNLOADED each one.
--
--   • resources gains file/link columns + denormalized view/download counters
--     (the counters are a fast display cache; resource_events below is the
--     append-only source of truth and can rebuild them).
--   • resource_events logs every view/download (admin-readable only).
--   • a PRIVATE `resource-files` bucket holds the actual files; downloads flow
--     through /api/resources/download/[slug], which mints a short-lived signed
--     URL and increments the counter — so every download is counted and the
--     storage path stays non-guessable.

-- ── resources: file/link + counters ──────────────────────────────────────────
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS file_path       TEXT,     -- key in the resource-files bucket
  ADD COLUMN IF NOT EXISTS external_url    TEXT,     -- alternative: link out instead of a hosted file
  ADD COLUMN IF NOT EXISTS file_name       TEXT,     -- original filename (used for the download)
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS view_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count  INTEGER NOT NULL DEFAULT 0;

-- ── resource_events: append-only view/download log ───────────────────────────
CREATE TABLE IF NOT EXISTS resource_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id  UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL CHECK (event_type IN ('view', 'download')),
  session_hash TEXT,               -- best-effort per-visitor de-dup (hashed, not PII)
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resource_events_resource_type_idx
  ON resource_events (resource_id, event_type, created_at DESC);

ALTER TABLE resource_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read the raw event stream. Inserts happen through the service
-- client in the route handlers (bypasses RLS), so no public insert policy.
DROP POLICY IF EXISTS "resource_events_admin_read" ON resource_events;
CREATE POLICY "resource_events_admin_read" ON resource_events
  FOR SELECT USING (is_admin());

-- ── atomic counter bumps (avoid read-modify-write races) ─────────────────────
CREATE OR REPLACE FUNCTION increment_resource_view(p_resource_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE resources SET view_count = view_count + 1 WHERE id = p_resource_id;
$$;

CREATE OR REPLACE FUNCTION increment_resource_download(p_resource_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE resources SET download_count = download_count + 1 WHERE id = p_resource_id;
$$;

-- ── private storage bucket for resource files ────────────────────────────────
-- Private: the only way to fetch a file is a signed URL minted by the download
-- route, which is where the download gets counted.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-files',
  'resource-files',
  false,
  26214400, -- 25 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'application/zip',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Admin-manage policy (uploads normally go through the service client, but this
-- keeps direct dashboard access working and is harmless otherwise).
DROP POLICY IF EXISTS "Admins can manage resource files" ON storage.objects;
CREATE POLICY "Admins can manage resource files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'resource-files'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  bucket_id = 'resource-files'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
