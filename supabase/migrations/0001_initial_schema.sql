-- Thryve Growth Co. — Initial Schema
-- Run via: npx supabase db push  OR  apply manually in Supabase SQL editor

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  avatar_url TEXT,
  company TEXT,
  job_title TEXT,
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── Availability Slots ───────────────────────────────────────────────────────
CREATE TABLE availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  service_type TEXT,   -- NULL = available for any service
  is_booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (slot_date, start_time)
);

-- ─── Bookings ─────────────────────────────────────────────────────────────────
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  slot_id UUID REFERENCES availability_slots(id),
  service_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  client_notes TEXT,
  admin_notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount_cents INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  service_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Documents ────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  uploaded_by UUID REFERENCES profiles(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INT,
  category TEXT CHECK (
    category IN ('resume', 'cover_letter', 'notes', 'worksheet', 'template', 'other')
  ),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Watchlist Profiles ───────────────────────────────────────────────────────
CREATE TABLE watchlist_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) UNIQUE,
  target_roles TEXT[],
  industries TEXT[],
  locations TEXT[],
  salary_min INT,
  salary_max INT,
  remote_preference TEXT CHECK (remote_preference IN ('remote', 'hybrid', 'onsite', 'any')),
  experience_level TEXT,
  preferences_notes TEXT,
  subscription_status TEXT DEFAULT 'active',
  stripe_subscription_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Job Listings ─────────────────────────────────────────────────────────────
CREATE TABLE job_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  url TEXT,
  description TEXT,
  salary_range TEXT,
  source TEXT,        -- 'manual' | 'jsearch'
  external_id TEXT,   -- JSearch job ID for dedup
  date_posted DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Client Job Matches ───────────────────────────────────────────────────────
CREATE TABLE client_job_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  job_id UUID REFERENCES job_listings(id),
  status TEXT DEFAULT 'new' CHECK (
    status IN ('new', 'saved', 'interested', 'applied', 'not_a_fit',
               'archived', 'interviewing', 'offer')
  ),
  rachel_recommended BOOLEAN DEFAULT FALSE,
  client_notes TEXT,
  application_date DATE,
  interview_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, job_id)
);

-- ─── Admin Client Notes ───────────────────────────────────────────────────────
CREATE TABLE admin_client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id),
  note TEXT NOT NULL,
  session_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Blog Posts ───────────────────────────────────────────────────────────────
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content JSONB,
  featured_image_path TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Newsletter Subscribers ───────────────────────────────────────────────────
CREATE TABLE newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  source TEXT,
  ghl_contact_id TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles: users see own row; admins see all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Availability slots: anyone authenticated can read (for booking calendar)
CREATE POLICY "slots_select_auth" ON availability_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "slots_all_admin"   ON availability_slots FOR ALL   USING (is_admin());

-- Bookings: clients see own; admins see all
CREATE POLICY "bookings_select_own"   ON bookings FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "bookings_insert_own"   ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());
CREATE POLICY "bookings_update_admin" ON bookings FOR UPDATE USING (is_admin());

-- Payments: clients see own; admins see all
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "payments_all_admin"  ON payments FOR ALL   USING (is_admin());

-- Documents: clients see own; admins manage all
CREATE POLICY "docs_select_own"  ON documents FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "docs_insert_admin" ON documents FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "docs_delete_admin" ON documents FOR DELETE USING (is_admin());

-- Watchlist profiles: clients see/update own; admins see all
CREATE POLICY "watchlist_select_own"  ON watchlist_profiles FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "watchlist_upsert_own"  ON watchlist_profiles FOR INSERT WITH CHECK (auth.uid() = client_id OR is_admin());
CREATE POLICY "watchlist_update_own"  ON watchlist_profiles FOR UPDATE USING (auth.uid() = client_id OR is_admin());

-- Job listings: authenticated users can read; admins manage
CREATE POLICY "jobs_select_auth" ON job_listings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "jobs_all_admin"   ON job_listings FOR ALL   USING (is_admin());

-- Client job matches: clients see own; admins manage all
CREATE POLICY "matches_select_own"  ON client_job_matches FOR SELECT USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "matches_update_own"  ON client_job_matches FOR UPDATE USING (auth.uid() = client_id OR is_admin());
CREATE POLICY "matches_insert_admin" ON client_job_matches FOR INSERT WITH CHECK (is_admin());

-- Admin notes: admins only
CREATE POLICY "notes_admin" ON admin_client_notes FOR ALL USING (is_admin());

-- Blog posts: published posts are public; admins manage all
CREATE POLICY "blog_select_public" ON blog_posts FOR SELECT USING (published = TRUE OR is_admin());
CREATE POLICY "blog_all_admin"     ON blog_posts FOR ALL   USING (is_admin());

-- Newsletter: admins only
CREATE POLICY "newsletter_admin" ON newsletter_subscribers FOR ALL USING (is_admin());
-- Allow anonymous inserts for subscribe form
CREATE POLICY "newsletter_insert_anon" ON newsletter_subscribers FOR INSERT WITH CHECK (TRUE);
