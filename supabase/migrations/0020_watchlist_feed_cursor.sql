-- 0020_watchlist_feed_cursor.sql
--
-- Lets /api/cron/job-feed process a small BATCH of clients per run instead of
-- all at once, so each invocation finishes well within the Vercel Hobby 10s
-- function cap (no plan upgrade needed). The cron orders active clients by
-- last_feed_at (oldest first, NULLs first), processes JOB_FEED_BATCH of them,
-- and stamps last_feed_at — so the feed rotates through everyone over a few
-- daily runs and keeps refreshing. Also keeps external API usage low.

ALTER TABLE watchlist_profiles
  ADD COLUMN IF NOT EXISTS last_feed_at TIMESTAMPTZ;

-- Hot path for the cron's "least-recently-fed active clients" query.
CREATE INDEX IF NOT EXISTS watchlist_profiles_feed_cursor_idx
  ON watchlist_profiles(last_feed_at NULLS FIRST)
  WHERE subscription_status = 'active';
