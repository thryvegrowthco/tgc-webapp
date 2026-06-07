-- 0016_watchlist_expansion.sql
--
-- Expands watchlist_profiles to capture the full Job Alerts onboarding
-- questionnaire from the master spec. The original table held 8 preference
-- fields; this adds the remaining ~13 (employment types, keywords, skills,
-- certifications, education, employer include/exclude lists, job-board
-- preferences, work environment, travel, work authorization, and the
-- must-have / nice-to-have split that the scoring engine treats as a hard
-- gate vs. soft bonus).
--
-- Also adds a NON-BLOCKING review surface so Rachel can see + curate each new
-- submission. Activation stays pay-first (Stripe checkout auto-activates the
-- subscription); review_status is informational only and never gates access.
--
-- Finally, formalizes the subscription_status value set with a CHECK so the
-- webhook can map paused / expired distinctly instead of collapsing them to
-- 'inactive'.

-- ─── 1. Questionnaire fields ─────────────────────────────────────────────────
ALTER TABLE watchlist_profiles
  ADD COLUMN IF NOT EXISTS employment_types TEXT[],          -- ['full_time','part_time','contract','temporary']
  ADD COLUMN IF NOT EXISTS keywords TEXT[],
  ADD COLUMN IF NOT EXISTS skills TEXT[],
  ADD COLUMN IF NOT EXISTS certifications TEXT[],
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS preferred_employers TEXT[],
  ADD COLUMN IF NOT EXISTS excluded_employers TEXT[],
  ADD COLUMN IF NOT EXISTS job_board_preferences TEXT[],     -- ['linkedin','indeed','jsearch','usajobs', ...]
  ADD COLUMN IF NOT EXISTS work_environment TEXT,            -- free-text: startup vs corporate, pace, etc.
  ADD COLUMN IF NOT EXISTS travel_preference TEXT,           -- 'none' | 'occasional' | 'frequent' | 'willing'
  ADD COLUMN IF NOT EXISTS work_authorization_notes TEXT,
  ADD COLUMN IF NOT EXISTS must_haves TEXT[],                -- hard requirements: scoring gate (fail = excluded)
  ADD COLUMN IF NOT EXISTS nice_to_haves TEXT[];             -- soft bonuses: additive score only

-- ─── 2. Non-blocking review surface ──────────────────────────────────────────
ALTER TABLE watchlist_profiles
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'reviewed')),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Surfaces the "Pending Review" queue on the admin overview cheaply.
CREATE INDEX IF NOT EXISTS watchlist_profiles_review_idx
  ON watchlist_profiles(review_status) WHERE review_status = 'pending_review';

-- ─── 3. Formalize subscription_status values ─────────────────────────────────
-- Existing rows only ever hold active/inactive/cancelled, all within the new
-- set, so adding the constraint is safe without a data backfill.
ALTER TABLE watchlist_profiles DROP CONSTRAINT IF EXISTS watchlist_profiles_subscription_status_check;
ALTER TABLE watchlist_profiles ADD CONSTRAINT watchlist_profiles_subscription_status_check
  CHECK (subscription_status IN ('active', 'inactive', 'paused', 'cancelled', 'expired'));
