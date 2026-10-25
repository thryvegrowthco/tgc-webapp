-- 0035_bookings_guest_contact.sql
--
-- Store contact details for sessions created without a client account.
--
-- An admin can add a session for someone who has no portal login ("No account"
-- in the New session dialog): a name and email are typed in. Until now those
-- were only used to resolve a matching profile and to address the confirmation
-- email, then discarded, so a no-account row showed as "Unknown client" in the
-- Sessions hub.
--
-- Persist the typed name and email on the booking so no-account sessions display
-- their client. Both nullable: account-linked rows (client_id set) leave these
-- NULL and read the name and email from profiles instead.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

COMMENT ON COLUMN bookings.guest_name IS
  'Name for a no-account session (client_id IS NULL). NULL when the booking is linked to a profile.';
COMMENT ON COLUMN bookings.guest_email IS
  'Email for a no-account session (client_id IS NULL). NULL when the booking is linked to a profile.';
