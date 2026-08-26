-- 0033_comped_watchlist_access.sql
--
-- Complimentary ("comped") Job Alerts access, plus the security fix that makes
-- the distinction meaningful.
--
--   • watchlist_profiles gains `access_source` ('paid' | 'comped') so Rachel can
--     hand someone free access without corrupting revenue metrics. The ACCESS
--     GATE IS UNCHANGED — it is still `subscription_status = 'active'`, which
--     keeps the three crons (job-feed, job-alerts, expire-matches) and the
--     `watchlist_profiles_feed_cursor_idx` partial index working untouched, so a
--     comped client receives job matches and digests exactly like a paying one.
--
--     INVARIANT: access_source answers "if this row is currently active, is that
--     access paid or comped?" It is don't-care for inactive rows.
--
--   • `comped_until` gives a comp an optional end date. It is deliberately NOT
--     part of the gate — /api/cron/expire-matches flips lapsed comps to
--     'inactive' instead, so `subscription_status = 'active'` remains the single
--     index-backed truth for "has access right now".
--
--   • `comp_note` / `comped_by` / `comped_at` record who granted it and why, and
--     are kept as history after a comp is revoked or converted to paid.
--
--   • SECURITY FIX. `subscription_status` defaulted to 'active', and both
--     saveWatchlistProfile and updateWatchlistProfileAsAdmin insert without
--     setting it — so any logged-in user who submitted the (ungated)
--     /dashboard/watchlist/setup questionnaire granted themselves full paid
--     access. RLS `watchlist_update_own` has no column restriction either, so
--     the same was reachable with a direct PostgREST PATCH. This migration flips
--     the default to 'inactive' and adds a trigger that pins every privileged
--     column for end-user roles.

-- ── comp columns ─────────────────────────────────────────────────────────────
ALTER TABLE watchlist_profiles
  ADD COLUMN IF NOT EXISTS access_source TEXT NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS comp_note     TEXT,
  ADD COLUMN IF NOT EXISTS comped_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comped_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comped_until  TIMESTAMPTZ;-- nullable: NULL = no expiry

ALTER TABLE watchlist_profiles DROP CONSTRAINT IF EXISTS watchlist_profiles_access_source_check;
ALTER TABLE watchlist_profiles ADD CONSTRAINT watchlist_profiles_access_source_check
  CHECK (
    access_source IN (
      -- a real Stripe subscription is (or was) paying for this
      'paid',
      -- granted at no cost by an admin
      'comped'
    )
  );

COMMENT ON COLUMN watchlist_profiles.access_source IS
  'If this row is currently active, is that access paid or comped? Don''t-care for inactive rows. Set to ''paid'' by the Stripe subscription webhook; set to ''comped'' by grantComplimentaryAccess.';
COMMENT ON COLUMN watchlist_profiles.comped_until IS
  'Optional comp end date. NOT part of the access gate — /api/cron/expire-matches flips lapsed comps to subscription_status = ''inactive''. NULL means no expiry.';

-- Lets the expire-matches sweep find lapsed comps without a seq scan.
CREATE INDEX IF NOT EXISTS watchlist_profiles_comp_expiry_idx
  ON watchlist_profiles (comped_until)
  WHERE access_source = 'comped' AND comped_until IS NOT NULL;

-- ── backfill legacy manual activations ───────────────────────────────────────
-- Every existing row just picked up access_source = 'paid' from the DEFAULT.
-- Rows that are active with no Stripe subscription were never paying — they came
-- from the DEFAULT 'active' hole described above. Label them honestly so they
-- keep their access and stop inflating the paid-subscriber counters.
UPDATE watchlist_profiles
   SET access_source = 'comped',
       comp_note     = 'backfilled: legacy manual activation (pre-0033)',
       comped_at     = COALESCE(updated_at, NOW())
 WHERE stripe_subscription_id IS NULL
   AND subscription_status = 'active'
   AND access_source = 'paid';

-- ── security: stop self-granted access ───────────────────────────────────────
-- New rows are inactive until something deliberate activates them (the Stripe
-- webhook, or an admin comp grant).
ALTER TABLE watchlist_profiles ALTER COLUMN subscription_status SET DEFAULT 'inactive';

-- Column-level REVOKE cannot work here: Supabase grants table-level UPDATE on
-- public tables to `authenticated`, a table-level privilege implies every column,
-- and REVOKE UPDATE (col) cannot subtract from it (it only drops column-specific
-- grants). The alternative — REVOKE UPDATE then GRANT UPDATE on an allow-list of
-- the ~22 criteria columns — fails closed and silently every time a criteria
-- column is added (0016 added 15 at once). A BEFORE trigger needs no upkeep:
-- criteria pass through, privileged columns do not.
--
-- Applies ONLY to the PostgREST end-user roles. service_role (Stripe webhook,
-- admin server actions) and postgres are unaffected.
--
-- RULE THIS IMPOSES: any future admin write to these columns MUST go through
-- createServiceClient(). RLS `watchlist_update_own` does let an admin update
-- rows via the cookie client, and this trigger would silently discard the change.
CREATE OR REPLACE FUNCTION public.watchlist_guard_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A client may create their own criteria row; it starts with no access.
    NEW.subscription_status    := 'inactive';
    NEW.stripe_subscription_id := NULL;
    NEW.access_source          := 'paid';
    NEW.comp_note              := NULL;
    NEW.comped_by              := NULL;
    NEW.comped_at              := NULL;
    NEW.comped_until           := NULL;
    NEW.review_status          := 'pending_review';
    NEW.reviewed_at            := NULL;
    NEW.reviewed_by            := NULL;
    NEW.last_feed_at           := NULL;
  ELSE
    -- Criteria edits are allowed; everything privileged is pinned to OLD.
    NEW.subscription_status    := OLD.subscription_status;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.access_source          := OLD.access_source;
    NEW.comp_note              := OLD.comp_note;
    NEW.comped_by              := OLD.comped_by;
    NEW.comped_at              := OLD.comped_at;
    NEW.comped_until           := OLD.comped_until;
    NEW.review_status          := OLD.review_status;
    NEW.reviewed_at            := OLD.reviewed_at;
    NEW.reviewed_by            := OLD.reviewed_by;
    NEW.last_feed_at           := OLD.last_feed_at;
  END IF;

  RETURN NEW;
END $$;

-- Coerce rather than RAISE: PostgREST returns 200 with the coerced row, so a
-- legitimate criteria save is never at risk if its payload ever drifts.
DROP TRIGGER IF EXISTS watchlist_guard_privileged_columns ON watchlist_profiles;
CREATE TRIGGER watchlist_guard_privileged_columns
  BEFORE INSERT OR UPDATE ON watchlist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.watchlist_guard_privileged_columns();
