-- Public storage bucket for blog featured images.
-- Must be public so images load on unauthenticated blog pages.
-- Client documents remain in the private 'documents' bucket.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  10485760, -- 10 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload/update/delete blog images
CREATE POLICY "Admins can manage blog images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can read blog images (public bucket, but explicit policy for clarity)
CREATE POLICY "Public read for blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');
