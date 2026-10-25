-- 0037_calendar_issue_notification_type.sql
--
-- Add a dedicated 'calendar_issue' value to the admin_notifications.type CHECK
-- constraint. The Google Calendar "disconnected, reconnect needed" bell used to
-- reuse 'subscription_issue', which mislabeled it and let the subscription
-- notification preference silence it. recordAuthFailure() in
-- src/lib/google/calendar.ts now writes type = 'calendar_issue'.
--
-- Idempotent: the constraint is dropped if present and recreated with the full
-- current value set plus the new value. Safe to re-run.
--
-- File only. Apply via apply-0037.sql in the Supabase SQL editor.

ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check
  CHECK (
    type IN (
      'new_booking', 'intake_submitted', 'client_doc_upload', 'intake_overdue',
      'session_in_24h', 'new_subscriber', 'subscriber_unsubscribed',
      'subscriber_updated', 'new_subscription', 'subscription_issue',
      'watchlist_updated', 'application_status', 'client_message',
      'session_booked_via_invite', 'proposal_accepted', 'proposal_paid',
      -- added 0037
      'calendar_issue'
    )
  );
