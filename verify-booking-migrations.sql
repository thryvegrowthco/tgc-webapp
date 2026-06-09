-- Paste into Supabase Dashboard → SQL Editor → Run. One row of pass/fail flags.
select
  to_regclass('public.booking_invitations')        is not null  as t_booking_invitations,
  to_regclass('public.booking_invitation_options') is not null  as t_options,
  exists(select 1 from information_schema.columns where table_name='bookings' and column_name='duration_minutes')           as col_duration_minutes,
  exists(select 1 from information_schema.columns where table_name='bookings' and column_name='payment_status')             as col_payment_status,
  exists(select 1 from information_schema.columns where table_name='bookings' and column_name='booking_invitation_id')      as col_booking_invitation_id,
  exists(select 1 from information_schema.columns where table_name='bookings' and column_name='reminder_1h_sent_at')        as col_reminder_1h,
  exists(select 1 from information_schema.columns where table_name='booking_invitation_options' and column_name='reserved_at') as col_reserved_at,
  exists(select 1 from pg_indexes where indexname='bookings_booking_invitation_id_key')                                     as unique_idx_present,
  (select count(*) from email_templates where key in
     ('booking_invitation','session_confirmed','new_session_booked','session_reminder_1h'))                                 as new_templates_count_expect_4,
  exists(select 1 from pg_policies where tablename='booking_invitations' and policyname='booking_invitations_select_own')   as leftover_client_policy_expect_false,
  exists(select 1 from pg_constraint where conname='bookings_workflow_status_check'
         and pg_get_constraintdef(oid) like '%no_show%')                                                                    as workflow_status_has_no_show;
