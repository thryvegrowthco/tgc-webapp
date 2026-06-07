-- 0021_admin_notification_types.sql
--
-- Widens admin_notifications.type so the in-app bell can surface every inbound
-- interaction that now also emails Rachel (newsletter subscribe/unsubscribe/
-- preference changes, Job Alerts subscription purchase, subscription issues,
-- watchlist edits, application status changes, and client messages). Pairs with
-- notifyAdmin() in src/lib/notifications/admin.ts.

ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check
  CHECK (
    type IN (
      -- existing
      'new_booking',
      'intake_submitted',
      'client_doc_upload',
      'intake_overdue',
      'session_in_24h',
      -- added 0021
      'new_subscriber',
      'subscriber_unsubscribed',
      'subscriber_updated',
      'new_subscription',
      'subscription_issue',
      'watchlist_updated',
      'application_status',
      'client_message'
    )
  );
