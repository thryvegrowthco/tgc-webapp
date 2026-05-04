-- Thryve Growth Co. — Leads table
-- Captures non-authenticated prospects from the public lead-capture form
-- on /services/job-alerts. Lead pipeline: new → contacted → qualified →
-- converted → lost.

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  current_role TEXT,
  target_role TEXT,
  location TEXT,
  remote_preference TEXT CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'any')),
  timeline TEXT,
  notes TEXT,
  source TEXT DEFAULT 'job_watchlist',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  admin_notes TEXT,
  converted_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_email_idx ON leads(email);
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);

-- RLS: only admins can read/write
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Public inserts handled via service-role client in /api/leads route, not RLS
