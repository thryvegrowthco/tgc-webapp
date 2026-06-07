-- 0017_match_curation_and_tracker.sql
--
-- Two related expansions of client_job_matches:
--
--   1. Manual curation metadata — when Rachel hand-picks a job she can now
--      attach why-it-matches, private notes, a priority, and a recommended
--      action. These surface on the client's job card under the "Curated by
--      Rachel" label.
--
--   2. A real application tracker — salary offered, next steps, a favorite
--      flag, and links to the specific resume + cover letter used. The status
--      enum is widened to the full 9-stage spec lifecycle. Legacy values
--      (new/saved/applied/interviewing/offer/not_a_fit/archived) are retained
--      for back-compat; the UI maps the legacy 'offer' to 'offer_received'.

-- ─── 1. Curation metadata ────────────────────────────────────────────────────
ALTER TABLE client_job_matches
  ADD COLUMN IF NOT EXISTS rachel_notes TEXT,
  ADD COLUMN IF NOT EXISTS match_reason TEXT,                -- "Why it matches"
  ADD COLUMN IF NOT EXISTS priority_level TEXT
    CHECK (priority_level IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS recommended_action TEXT;

-- ─── 2. Application tracker fields ───────────────────────────────────────────
ALTER TABLE client_job_matches
  ADD COLUMN IF NOT EXISTS salary_offered INT,
  ADD COLUMN IF NOT EXISTS next_steps TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resume_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_letter_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- ─── 3. Widen the status lifecycle ───────────────────────────────────────────
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
      'offer'
    )
  );

-- Favorites + saved jobs view hits this often.
CREATE INDEX IF NOT EXISTS client_job_matches_favorite_idx
  ON client_job_matches(client_id) WHERE is_favorite = TRUE;
