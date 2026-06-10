-- Thryve Growth Co. — Phase 1a: multi-session package credits
--
-- Buying coaching_package (4 sessions) / interview_package (3) previously created
-- ONE booking with no way to schedule the rest. This adds a credit ledger:
-- a purchase grants N credits; the client redeems each by booking a slot from
-- the portal (no new payment); Rachel sees "X of N used".

CREATE TABLE IF NOT EXISTS session_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,           -- e.g. coaching_package
  service_type TEXT NOT NULL,          -- display name
  sessions_total INT NOT NULL CHECK (sessions_total > 0),
  sessions_used INT NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  amount_cents INT,
  stripe_session_id TEXT,              -- the purchase Checkout session (idempotency)
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exhausted', 'expired', 'refunded')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,              -- purchased_at + 90 days (per service agreement)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (sessions_used <= sessions_total)
);

CREATE INDEX IF NOT EXISTS session_packages_client_idx ON session_packages(client_id);
CREATE INDEX IF NOT EXISTS session_packages_active_idx
  ON session_packages(client_id, service_key) WHERE status = 'active';
-- One package row per purchase Checkout session (webhook idempotency).
CREATE UNIQUE INDEX IF NOT EXISTS session_packages_stripe_session_key
  ON session_packages(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Link a redeemed/first session to its package.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS session_package_id UUID REFERENCES session_packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_session_package_idx
  ON bookings(session_package_id) WHERE session_package_id IS NOT NULL;

ALTER TABLE session_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_packages_select_own" ON session_packages
  FOR SELECT USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "session_packages_admin" ON session_packages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
