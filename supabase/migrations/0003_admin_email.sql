-- Auto-assign admin role based on a configurable email address.
--
-- SETUP (run once in Supabase SQL editor after applying this migration):
--   ALTER DATABASE postgres SET app.admin_email = 'rachel@thryvegrowth.co';
--
-- Replace the email with the actual admin email address.
-- After setting it, any new signup with that exact email will automatically
-- get role = 'admin'. Existing users are not affected — update them manually:
--   UPDATE profiles SET role = 'admin' WHERE email = 'rachel@thryvegrowth.co';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_admin_email TEXT;
  v_role TEXT;
BEGIN
  -- Read the configured admin email (returns NULL if not set)
  v_admin_email := current_setting('app.admin_email', true);

  -- Assign admin role if email matches; otherwise default to client
  IF v_admin_email IS NOT NULL AND NEW.email = v_admin_email THEN
    v_role := 'admin';
  ELSE
    v_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    v_role
  );
  RETURN NEW;
END;
$$;
