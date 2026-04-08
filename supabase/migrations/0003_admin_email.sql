-- Auto-assign admin role for the configured admin email on signup.
--
-- If ALTER ROLE / ALTER DATABASE is blocked by your Supabase plan, the
-- function falls back to the hardcoded ADMIN_EMAIL constant below.
--
-- To update the admin email, change the constant and re-run this migration
-- in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  ADMIN_EMAIL CONSTANT TEXT := 'thryvegrowthco@gmail.com';
  v_role TEXT;
BEGIN
  IF NEW.email = ADMIN_EMAIL THEN
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
