// Session reminder cron — runs hourly.
// Fires:
//   • T-24h client reminder (window 23h–25h before session)
//   • T-1h  client reminder (window 0h–1.5h before session)
//   • T-2h  Rachel prep summary (window 1h–3h before session)
// Also sweeps abandoned invitation-option reservations (payment-ON checkouts
// that were never completed) back to 'open'.
//
// Idempotent via automation_log + the dedicated *_sent_at columns on bookings.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTemplated } from "@/lib/email/render";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { renderShell } from "@/lib/email/shell";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";
import { getSchemaForService } from "@/lib/intake/schemas";
import { formatCentralDate, formatCentralTime, formatCentralDateTime } from "@/lib/time/central";
import { meetingTypeLabel, meetingLocationLine } from "@/lib/booking/display";
import { createAdminNotification } from "@/lib/notifications/admin";
import { isNotificationDisabled } from "@/lib/notifications/settings";

// Release option holds left reserved this long by an abandoned paid checkout.
const RESERVATION_TTL_MS = 2 * 60 * 60 * 1000;

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@thryvegrowth.co";
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const supabase = createServiceClient();

  // Pull every upcoming booking inside the next 26 hours that's still active.
  const horizonStart = now.toISOString();
  const horizonEnd = new Date(now.getTime() + 26 * HOUR_MS).toISOString();

  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_id, service_type, service_key, session_at, meet_link, workflow_status, session_reminder_sent_at, reminder_1h_sent_at, prep_summary_sent_at, client_notes, location_type, location_details")
    .in("workflow_status", ["intake_needed", "intake_complete", "session_scheduled"])
    .gte("session_at", horizonStart)
    .lte("session_at", horizonEnd);

  type Row = {
    id: string;
    client_id: string | null;
    service_type: string;
    service_key: string | null;
    session_at: string | null;
    meet_link: string | null;
    workflow_status: string;
    session_reminder_sent_at: string | null;
    reminder_1h_sent_at: string | null;
    prep_summary_sent_at: string | null;
    client_notes: string | null;
    location_type: string;
    location_details: string | null;
  };
  const bookings = (bookingsRaw ?? []) as Row[];

  // Hydrate clients
  const clientIds = [...new Set(bookings.map((b) => b.client_id).filter(Boolean))] as string[];
  let profiles: { id: string; full_name: string | null; email: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", clientIds);
    profiles = data ?? [];
  }
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Hydrate intake responses for prep summaries
  const bookingIds = bookings.map((b) => b.id);
  let intakes: { booking_id: string; responses: Record<string, unknown>; submitted_at: string | null }[] = [];
  if (bookingIds.length > 0) {
    const { data } = await supabase
      .from("intake_responses")
      .select("booking_id, responses, submitted_at")
      .in("booking_id", bookingIds);
    intakes = (data ?? []) as typeof intakes;
  }
  const intakeMap = new Map(intakes.map((i) => [i.booking_id, i]));

  let clientReminders = 0;
  let clientReminders1h = 0;
  let prepSummaries = 0;

  for (const booking of bookings) {
    if (!booking.client_id || !booking.session_at) continue;
    const profile = profileMap.get(booking.client_id);
    if (!profile) continue;

    const sessionAt = new Date(booking.session_at);
    const hoursUntil = (sessionAt.getTime() - now.getTime()) / HOUR_MS;

    // T-24h client reminder
    if (hoursUntil <= 25 && hoursUntil >= 23 && !booking.session_reminder_sent_at) {
      const result = await sendTemplated("session_reminder_24h", {
        to: profile.email,
        bookingId: booking.id,
        clientId: booking.client_id,
        idempotent: true,
        data: {
          client_name: profile.full_name?.split(" ")[0] || "there",
          session_date: formatCentralDate(sessionAt),
          session_time: formatCentralTime(sessionAt),
          meet_link: booking.meet_link ?? "Rachel will share the link shortly.",
          session_workspace_url: `${APP_URL}/dashboard/sessions/${booking.id}`,
        },
      });
      if (result.sent) {
        await supabase
          .from("bookings")
          .update({ session_reminder_sent_at: now.toISOString() })
          .eq("id", booking.id);
        clientReminders++;

        // Surface the upcoming session in Rachel's bell so she sees it
        // alongside the client's reminder. session_reminder_sent_at gates
        // duplicates — this branch only runs once per booking.
        await createAdminNotification({
          type: "session_in_24h",
          title: `Session tomorrow: ${profile.full_name || profile.email}`,
          body: `${booking.service_type} · ${formatCentralDateTime(sessionAt, { weekday: "long", hour: "numeric", minute: "2-digit" })} CT`,
          link: `/admin/clients/${booking.client_id}#booking-${booking.id}`,
          bookingId: booking.id,
          clientId: booking.client_id,
        });
      }
    }

    // T-1h client reminder (window 0–1.5h before; separate flag from the 24h one)
    if (hoursUntil <= 1.5 && hoursUntil >= 0 && !booking.reminder_1h_sent_at) {
      const result = await sendTemplated("session_reminder_1h", {
        to: profile.email,
        bookingId: booking.id,
        clientId: booking.client_id,
        idempotent: true,
        eventKey: "session_reminder_1h_sent",
        data: {
          client_name: profile.full_name?.split(" ")[0] || "there",
          session_date: formatCentralDate(sessionAt),
          session_time: formatCentralTime(sessionAt),
          meeting_type: meetingTypeLabel(booking.location_type),
          meet_link: booking.meet_link ?? "",
          meeting_location: meetingLocationLine(booking.location_type, booking.location_details),
          session_workspace_url: `${APP_URL}/dashboard/sessions/${booking.id}`,
        },
      });
      if (result.sent) {
        await supabase
          .from("bookings")
          .update({ reminder_1h_sent_at: now.toISOString() })
          .eq("id", booking.id);
        clientReminders1h++;
      }
    }

    // T-2h Rachel prep summary (admin can silence via admin_email:session_in_24h)
    if (
      hoursUntil <= 3 &&
      hoursUntil >= 1 &&
      !booking.prep_summary_sent_at &&
      !(await isNotificationDisabled("admin_email:session_in_24h"))
    ) {
      const intake = intakeMap.get(booking.id);
      const schema = getSchemaForService(booking.service_key);
      const innerHtml = buildPrepSummaryHtml({
        clientName: profile.full_name || profile.email,
        serviceType: booking.service_type,
        sessionAt,
        meetLink: booking.meet_link,
        workflowStatus: booking.workflow_status,
        clientNotes: booking.client_notes,
        intakeSubmitted: !!intake?.submitted_at,
        intakeResponses: intake?.responses ?? {},
        intakeFields: schema?.fields ?? [],
        adminUrl: `${APP_URL}/admin/clients/${booking.client_id}#booking-${booking.id}`,
      });

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Session prep: ${profile.full_name ?? profile.email} at ${formatCentralTime(sessionAt)}`,
          html: renderShell(innerHtml),
        });
        await supabase
          .from("bookings")
          .update({ prep_summary_sent_at: now.toISOString() })
          .eq("id", booking.id);
        await supabase.from("automation_log").upsert(
          {
            event_key: "prep_summary_sent",
            booking_id: booking.id,
            client_id: booking.client_id,
            status: "success",
          },
          { onConflict: "event_key,booking_id" }
        );
        prepSummaries++;
      } catch (err) {
        await supabase.from("automation_log").upsert(
          {
            event_key: "prep_summary_sent",
            booking_id: booking.id,
            client_id: booking.client_id,
            status: "failed",
            error_message: err instanceof Error ? err.message : String(err),
          },
          { onConflict: "event_key,booking_id" }
        );
      }
    }
  }

  // ─── Reservation TTL sweep ───────────────────────────────────────────────
  // Payment-ON checkouts that were abandoned (tab closed, never returned to
  // cancel_url) leave an option 'reserved'. Release any held longer than the
  // TTL on invitations that haven't been accepted, so the times reopen.
  let releasedHolds = 0;
  const cutoff = new Date(now.getTime() - RESERVATION_TTL_MS).toISOString();
  const { data: staleOpts } = await supabase
    .from("booking_invitation_options")
    .select("id, invitation_id")
    .eq("status", "reserved")
    .lt("reserved_at", cutoff);
  const staleInvIds = [...new Set((staleOpts ?? []).map((o) => o.invitation_id))];
  if (staleInvIds.length > 0) {
    const { data: liveInvs } = await supabase
      .from("booking_invitations")
      .select("id, status, booking_id")
      .in("id", staleInvIds);
    // Only release holds on invitations that are still awaiting a pick.
    const releasable = new Set(
      (liveInvs ?? [])
        .filter((i) => !i.booking_id && i.status !== "accepted" && i.status !== "cancelled")
        .map((i) => i.id)
    );
    const optIdsToRelease = (staleOpts ?? [])
      .filter((o) => releasable.has(o.invitation_id))
      .map((o) => o.id);
    if (optIdsToRelease.length > 0) {
      const { data: released } = await supabase
        .from("booking_invitation_options")
        .update({ status: "open", reserved_at: null })
        .in("id", optIdsToRelease)
        .eq("status", "reserved")
        .select("id");
      releasedHolds = released?.length ?? 0;
    }
  }

  return Response.json({
    ok: true,
    now: now.toISOString(),
    scanned: bookings.length,
    client_reminders: clientReminders,
    client_reminders_1h: clientReminders1h,
    prep_summaries: prepSummaries,
    released_holds: releasedHolds,
  });
}

interface PrepSummaryArgs {
  clientName: string;
  serviceType: string;
  sessionAt: Date;
  meetLink: string | null;
  workflowStatus: string;
  clientNotes: string | null;
  intakeSubmitted: boolean;
  intakeResponses: Record<string, unknown>;
  intakeFields: { id: string; label: string; type: string }[];
  adminUrl: string;
}

function buildPrepSummaryHtml(args: PrepSummaryArgs): string {
  const intakeWarning = !args.intakeSubmitted
    ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:0 0 16px;">
        <p style="margin:0;color:#92400e;font-size:14px;"><strong>Intake not submitted.</strong> Consider treating this as an intake call format.</p>
      </div>`
    : "";

  const intakeSection = args.intakeSubmitted
    ? `<h3 style="margin:24px 0 12px;font-size:14px;color:#0f172a;">Intake responses</h3>
       ${args.intakeFields
         .map((f) => {
           const value = args.intakeResponses[f.id];
           if (value === undefined || value === null || value === "") return "";
           const displayValue = Array.isArray(value)
             ? value.map((v) => (typeof v === "object" && v !== null ? (v as { filename?: string }).filename ?? "[file]" : String(v))).join(", ")
             : typeof value === "object"
             ? ((value as { filename?: string }).filename ?? "[file]")
             : String(value);
           return `<div style="margin:0 0 10px;">
             <p style="margin:0 0 2px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(f.label)}</p>
             <p style="margin:0;color:#0f172a;font-size:14px;white-space:pre-wrap;">${escapeHtml(displayValue)}</p>
           </div>`;
         })
         .join("")}`
    : "";

  return `<h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;">${escapeHtml(args.clientName)}</h2>
<p style="margin:0 0 16px;color:#64748b;font-size:14px;">${escapeHtml(args.serviceType)}</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px;background:#ffffff;border-radius:8px;border:1px solid #e2e8f0;">
  <tr><td style="padding:16px;">
    <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Session in 2 hours</p>
    <p style="margin:0;color:#0f172a;font-weight:600;">${escapeHtml(formatCentralDateTime(args.sessionAt, { weekday: "long", hour: "numeric", minute: "2-digit" }))} CT</p>
    ${args.meetLink ? `<p style="margin:8px 0 0;"><a href="${args.meetLink}" style="color:#203e35;font-weight:600;">${escapeHtml(args.meetLink)}</a></p>` : `<p style="margin:8px 0 0;color:#92400e;font-size:13px;">No meet link recorded.</p>`}
  </td></tr>
</table>

${intakeWarning}

${args.clientNotes ? `<p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Client notes at booking</p>
<p style="margin:0 0 16px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(args.clientNotes)}</p>` : ""}

${intakeSection}

<p style="margin:24px 0 0;text-align:center;"><a href="${args.adminUrl}" style="display:inline-block;background:#203e35;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;">Open client record</a></p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
