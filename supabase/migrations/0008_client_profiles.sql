-- Thryve Growth Co. — Client intake profiles
-- Generic onboarding data captured on first dashboard visit. Distinct
-- from watchlist_profiles (which is service-specific). 1-1 with profiles.

CREATE TABLE client_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- About you
  location TEXT,
  timezone TEXT,
  pronouns TEXT,

  -- Professional context
  current_role TEXT,
  company TEXT,
  industry TEXT,
  years_experience TEXT, -- bucketed: '0-2', '3-5', '6-10', '10+'

  -- Why you're here
  primary_goal TEXT,
  services_interested TEXT[], -- e.g. ['coaching','interview_prep','resume','watchlist','hr_consulting','culture']

  -- How to work together
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text')),
  availability_notes TEXT,
  resume_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX client_profiles_client_id_idx ON client_profiles(client_id);
CREATE INDEX client_profiles_completed_at_idx ON client_profiles(completed_at);

-- RLS
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

-- Clients can read/write their own row
CREATE POLICY "Clients can read own client_profile"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own client_profile"
  ON client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own client_profile"
  ON client_profiles FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins can read all client_profiles"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
