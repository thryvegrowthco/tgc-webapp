-- Phase 5: Supabase Storage bucket + document RLS
-- Run via: npx supabase db push  OR  apply manually in Supabase SQL editor

-- ─── Storage bucket ───────────────────────────────────────────────────────────
-- Create private documents bucket (not public — all access via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  26214400,  -- 25 MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admins can upload/download anything
-- Clients can only download their own files
CREATE POLICY "Admins can do everything in documents bucket"
ON storage.objects FOR ALL
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Clients can read their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── admin_client_notes table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  session_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all notes"
ON admin_client_notes FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());
