-- 0031_job_expiry.sql
--
-- Phase 4: expire closed/stale job matches into an "Inactive" bucket.
--
--   • job_listings gains `closes_at` — the posting's real application deadline,
--     captured from sources that provide one (USAJOBS ApplicationCloseDate,
--     JSearch job_offer_expiration_datetime_utc).
--   • client_job_matches.status gains `expired` (system-set) so closed postings
--     leave the active list and show under a new Inactive tab (admin + client).
--   • the /api/cron/expire-matches sweep flips new/saved/interested matches to
--     `expired` when the deadline has passed, or — when no deadline is known —
--     when the posting is older than EXPIRE_AFTER_DAYS (default 45).

-- ── posting deadline ─────────────────────────────────────────────────────────
ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS job_listings_closes_at_idx
  ON job_listings (closes_at) WHERE closes_at IS NOT NULL;

-- ── add `expired` to the match status lifecycle ──────────────────────────────
ALTER TABLE client_job_matches DROP CONSTRAINT IF EXISTS client_job_matches_status_check;
ALTER TABLE client_job_matches ADD CONSTRAINT client_job_matches_status_check
  CHECK (
    status IN (
      -- spec lifecycle
      'interested', 'applied', 'interviewing', 'final_interview',
      'offer_received', 'accepted', 'declined', 'rejected', 'withdrawn',
      -- pre-application + housekeeping
      'new', 'saved', 'not_a_fit', 'archived',
      -- legacy (mapped to offer_received in UI)
      'offer',
      -- system-set: the posting closed / passed its deadline
      'expired'
    )
  );

-- Speeds the expire sweep + the Active/Inactive tab splits.
CREATE INDEX IF NOT EXISTS client_job_matches_client_status_idx
  ON client_job_matches (client_id, status);
