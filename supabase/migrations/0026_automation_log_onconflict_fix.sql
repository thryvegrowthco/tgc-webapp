-- Thryve Growth Co. — fix automation_log upsert idempotency (pre-existing bug)
--
-- Migration 0010 created the dedup index as PARTIAL:
--   CREATE UNIQUE INDEX automation_log_event_booking_uniq
--     ON automation_log(event_key, booking_id) WHERE booking_id IS NOT NULL;
-- But every caller upserts with `onConflict: "event_key,booking_id"`, i.e.
-- `ON CONFLICT (event_key, booking_id)` with no predicate. Postgres will NOT
-- infer a partial index from that, so the upsert errors with "no unique or
-- exclusion constraint matching the ON CONFLICT specification" and the write is
-- silently swallowed (errors are caught/ignored at every call site). Net effect:
-- the audit log never records reminder/calendar/email events, and sendTemplated's
-- idempotency dedup never fires.
--
-- Fix: make the index NON-partial so the conflict target matches. Behaviour is
-- preserved — rows with NULL booking_id stay non-unique (NULLS DISTINCT), exactly
-- as the partial index intended; only NOT-NULL pairs are deduped.

-- Drop any pre-existing duplicate (event_key, booking_id) pairs (keep the oldest)
-- so the unique index can be created. No-op if the log is empty/clean.
DELETE FROM automation_log a
USING automation_log b
WHERE a.ctid < b.ctid
  AND a.event_key = b.event_key
  AND a.booking_id = b.booking_id
  AND a.booking_id IS NOT NULL;

DROP INDEX IF EXISTS automation_log_event_booking_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS automation_log_event_booking_uniq
  ON automation_log(event_key, booking_id);
