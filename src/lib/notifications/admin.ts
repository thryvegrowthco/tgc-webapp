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
import { sendAdminAlert, type AdminAlertField } from "@/lib/email/resend";
import type { AdminNotificationType } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

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

// One call to notify Rachel of an inbound interaction on BOTH channels: a
// branded email (sendAdminAlert) and the in-app bell (createAdminNotification).
// Both are best-effort — a failure in either never blocks the caller. `link` is
// a relative admin path; it becomes the bell row link and the email CTA.
export interface NotifyAdminArgs {
  type: AdminNotificationType;
  /** Email subject. */
  subject: string;
  /** Headline shown in the bell AND as the email's headline. */
  title: string;
  /** Optional supporting line (bell body + email paragraph). */
  body?: string;
  /** Optional label/value rows for the email. */
  fields?: AdminAlertField[];
  /** Relative admin path, e.g. "/admin/clients/123". CTA label defaults to "Open in admin". */
  link?: string;
  ctaLabel?: string;
  /** Reply-to for the email (e.g. a subscriber's address). */
  replyTo?: string;
  bookingId?: string | null;
  clientId?: string | null;
}

export async function notifyAdmin(args: NotifyAdminArgs): Promise<void> {
  await Promise.allSettled([
    sendAdminAlert({
      subject: args.subject,
      headline: args.title,
      fields: args.fields,
      body: args.body,
      ctaUrl: args.link ? `${APP_URL}${args.link}` : undefined,
      ctaLabel: args.link ? args.ctaLabel ?? "Open in admin" : undefined,
      replyTo: args.replyTo,
    }),
    createAdminNotification({
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      bookingId: args.bookingId,
      clientId: args.clientId,
    }),
  ]);
}
