-- Thryve Growth Co. — Match scoring columns
-- Adds score (0-100) and score_label ('strong'|'good'|'maybe') to
-- client_job_matches so the auto-matching engine can record why a job
-- was matched, and so the UI can surface match strength.

ALTER TABLE client_job_matches
  ADD COLUMN score INTEGER,
  ADD COLUMN score_label TEXT CHECK (score_label IN ('strong', 'good', 'maybe'));

CREATE INDEX client_job_matches_score_idx ON client_job_matches(score DESC);
