-- 0034_bookings_drop_client_insert.sql
--
-- Tighten who may INSERT into bookings.
--
-- The original policy (0001) let any signed-in client insert their own booking
-- rows directly:
--
--   CREATE POLICY "bookings_insert_own" ON bookings
--     FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());
--
-- Nothing in the app relies on that client path: every real insert runs through
-- the service client in createSessionBooking (which bypasses RLS). Drop it and
-- replace with an admin-only insert policy so a client session can never write a
-- bookings row directly. The service-role webhook / admin action paths are
-- unaffected (service_role bypasses RLS entirely), matching docs_insert_admin.

DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;

CREATE POLICY "bookings_insert_admin" ON bookings FOR INSERT WITH CHECK (is_admin());
