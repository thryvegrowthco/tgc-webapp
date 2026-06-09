-- Thryve Growth Co. — Hardening for the booking-invitation feature (post-review)
--
-- 1. Make booking_invitation_id UNIQUE so one invitation can only ever produce
--    one session, even under a concurrent-accept / double-webhook race. The app
--    treats the unique violation as the already-finalized (idempotent) case.
-- 2. Remove the client-readable RLS on invitations: it exposed the admin-only
--    internal_notes column to the linked client (RLS is row-level, not
--    column-level). No app surface reads invitations from a client context — the
--    public booking page uses the service client. Keep admin-only access.

-- ─── 1. Unique invitation → booking ───────────────────────────────────────────
DROP INDEX IF EXISTS bookings_booking_invitation_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_invitation_id_key
  ON bookings(booking_invitation_id) WHERE booking_invitation_id IS NOT NULL;

-- ─── 2. Drop client SELECT on invitation tables (internal_notes hardening) ─────
DROP POLICY IF EXISTS "booking_invitations_select_own" ON booking_invitations;
DROP POLICY IF EXISTS "booking_invitation_options_select_own" ON booking_invitation_options;
