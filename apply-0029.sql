-- Thryve Growth Co. — Phase 3: Growth & Retention
--
-- Two additive features in one migration:
--
--   1. Testimonials (capture → approve → display). Today /testimonials is a
--      hardcoded array and the post-service follow-up email links to a dead
--      /testimonial 404. This makes testimonials DB-driven: a client submits one
--      via a per-booking token link (prefilled), it lands as `pending`, Rachel
--      approves it, and the public page renders approved rows.
--
--   2. Client goals / progress. A `client_goals` table both the client (from
--      their dashboard) and Rachel (from the client detail page) can manage. The
--      progress timeline reuses bookings.session_summary/next_steps (already
--      captured) — no schema change needed for those.
--
-- All additions are additive.

-- pgcrypto's gen_random_bytes() (the per-booking token default) lives in the
-- `extensions` schema on Supabase. The dashboard SQL Editor includes it in its
-- search_path, but `supabase db push` connects with a minimal one — so the
-- unqualified call resolves only when we add it here.
SET search_path = public, extensions;

-- ─── bookings.testimonial_token ───────────────────────────────────────────────
-- A dedicated bearer token for the testimonial submit link (NOT the booking id,
-- which is already public in /dashboard/sessions/[bookingId]). Added in four
-- steps so the backfill of existing rows never takes a table-rewrite lock: add
-- the column nullable (instant), backfill distinct tokens, then attach the
-- default for new rows.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS testimonial_token TEXT;
UPDATE bookings
  SET testimonial_token = encode(gen_random_bytes(16), 'hex')
  WHERE testimonial_token IS NULL;
ALTER TABLE bookings
  ALTER COLUMN testimonial_token SET DEFAULT encode(gen_random_bytes(16), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS bookings_testimonial_token_key
  ON bookings(testimonial_token) WHERE testimonial_token IS NOT NULL;

-- ─── testimonials ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,   -- nullable: submitter may have no account
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,  -- nullable: manual entries have none
  quote TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_title TEXT,
  service_type TEXT,                        -- snapshot of the booking's service (free text, not a FK)
  rating INT CHECK (rating BETWEEN 1 AND 5),-- nullable: manual entries may omit a rating
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'hidden')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One testimonial per booking; partial so manual entries (booking_id NULL) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS testimonials_booking_key
  ON testimonials(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS testimonials_status_idx ON testimonials(status);
CREATE INDEX IF NOT EXISTS testimonials_client_idx ON testimonials(client_id) WHERE client_id IS NOT NULL;

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
-- Admins manage everything.
CREATE POLICY "testimonials_admin" ON testimonials
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
-- Anyone (incl. anon) may read APPROVED testimonials — the public marketing page
-- relies on this. NOT scoped to `authenticated`. Submissions go through the
-- service client (booking token is the bearer), so no anon INSERT policy.
CREATE POLICY "testimonials_public_select" ON testimonials
  FOR SELECT USING (status = 'approved');

-- ─── client_goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'in_progress', 'completed', 'paused')),
  target_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- the client or the admin who added it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_goals_client_status_idx ON client_goals(client_id, status);

ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;
-- Two permissive policies OR-compose: the owner manages their own goals (client
-- self-serve from the dashboard), and admins manage all (Rachel, on the client
-- detail page). Both paths go through the server client; RLS does the gating.
CREATE POLICY "client_goals_admin" ON client_goals
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "client_goals_owner" ON client_goals
  FOR ALL USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
