-- 0032_blog_featured_image_alt.sql
--
-- Featured images can now be picked from Unsplash via the shared MediaPicker
-- (admin blog editor → Featured Image), not just uploaded as a file.
--
--   • The Unsplash proxy (/api/media/image) returns an alt string that already
--     carries the photographer credit — "… — Photo by {name} on Unsplash" — so
--     persist it alongside the URL instead of discarding it at save time.
--   • Rendered as the real alt text on the blog index card, the post hero, and
--     the OpenGraph image. NULL falls back to the post title, so existing rows
--     need no backfill.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS featured_image_alt TEXT;

COMMENT ON COLUMN blog_posts.featured_image_alt IS
  'Alt text for featured_image_path. For Unsplash picks this carries the "— Photo by X on Unsplash" credit. NULL falls back to the post title at render time.';
