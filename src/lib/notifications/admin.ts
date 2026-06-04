// Insert-and-forget helper for Rachel's in-app notification feed.
//
// Trigger sites mirror the existing email alerts (Stripe webhook, intake submit,
// cron reminders) so the bell + /admin/notifications inbox surface the same
// events that already hit her inbox. Email remains the system of record for
// "I missed something" recovery; the in-app feed is for triage at a glance.
//
// Failures are logged + swallowed. A missed notification never blocks the
// surrounding action — same posture as `logEvent` in src/lib/email/render.ts.

import { createServiceClient } from "@/lib/supabase/service";
import type { AdminNotificationType } from "@/types/database";

export interface CreateAdminNotificationArgs {
  type: AdminNotificationType;
  title: string;
  body?: string;
  link?: string;
  bookingId?: string | null;
  clientId?: string | null;
}

export async function createAdminNotification(args: CreateAdminNotificationArgs): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("admin_notifications").insert({
      type: args.type,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null,
      related_booking_id: args.bookingId ?? null,
      related_client_id: args.clientId ?? null,
    });
  } catch (err) {
    console.error("[admin notifications] insert failed:", err);
  }
}
