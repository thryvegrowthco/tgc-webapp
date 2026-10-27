-- Blocks signed-in/anonymous API callers from changing profiles.role.
-- service_role, postgres and handle_new_user() are unaffected.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'client';
    elsif new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed by this user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();
