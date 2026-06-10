"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyAdmin } from "@/lib/notifications/admin";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";
import { localCentralToUtcIso, formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { sendTemplated } from "@/lib/email/render";
import { meetingTypeLabel, meetingLocationLine, formatDuration, type LocationType } from "@/lib/booking/display";
import type { WorkflowStatus } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type Svc = ReturnType<typeof createServiceClient>;

interface SessionBooking {
  id: string;
  client_id: string | null;
  booking_invitation_id: string | null;
  service_type: string;
  session_at: string | null;
  duration_minutes: number;
  location_type: string;
  location_details: string | null;
  calendar_event_id: string | null;
  meet_link: string | null;
  workflow_status: string;
  session_package_id: string | null;
}

async function loadBooking(supabase: Svc, bookingId: string): Promise<SessionBooking | null> {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, client_id, booking_invitation_id, service_type, session_at, duration_minutes, location_type, location_details, calendar_event_id, meet_link, workflow_status, session_package_id"
    )
    .eq("id", bookingId)
    .maybeSingle();
  return (data as SessionBooking | null) ?? null;
}

const SELF_SERVICE_NOTICE_MS = 24 * 60 * 60 * 1000;

/** Clients can self-reschedule/cancel only while a session is >24h away. */
function canSelfModify(sessionAt: string | null): boolean {
  if (!sessionAt) return false;
  return new Date(sessionAt).getTime() > Date.now() + SELF_SERVICE_NOTICE_MS;
}

/** Return a package credit when a package-linked session is cancelled. */
async function returnPackageCredit(supabase: Svc, packageId: string | null): Promise<void> {
  if (!packageId) return;
  const { data: pkg } = await supabase
    .from("session_packages")
    .select("id, sessions_used, status")
    .eq("id", packageId)
    .maybeSingle();
  if (!pkg || pkg.sessions_used <= 0) return;
  await supabase
    .from("session_packages")
    .update({
      sessions_used: pkg.sessions_used - 1,
      status: pkg.status === "exhausted" ? "active" : pkg.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pkg.id);
}

/** Resolve the client's email + name from their profile or the source invitation. */
async function resolveClient(
  supabase: Svc,
  booking: SessionBooking
): Promise<{ email: string | null; name: string }> {
  if (booking.client_id) {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", booking.client_id)
      .maybeSingle();
    const p = data as { email: string; full_name: string | null } | null;
    if (p) return { email: p.email, name: p.full_name ?? "" };
  }
  if (booking.booking_invitation_id) {
    const { data } = await supabase
      .from("booking_invitations")
      .select("client_email, client_name")
      .eq("id", booking.booking_invitation_id)
      .maybeSingle();
    const i = data as { client_email: string; client_name: string | null } | null;
    if (i) return { email: i.client_email, name: i.client_name ?? "" };
  }
  return { email: null, name: "" };
}

function revalidateSession(clientId: string | null) {
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

/**
 * Move a session to a new Central date/time. Patches the existing Google Calendar
 * event (or creates one if missing), resets the reminder flags so they re-fire,
 * and re-sends the confirmation email to the client. Auth/ownership is the
 * caller's responsibility (admin wrapper or client wrapper).
 */
async function performReschedule(
  supabase: Svc,
  booking: SessionBooking,
  dateCentral: string,
  timeCentral: string
): Promise<{ error?: string; success?: boolean }> {
  if (!DATE_RE.test(dateCentral) || !TIME_RE.test(timeCentral)) {
    return { error: "Pick a valid date and time." };
  }
  const bookingId = booking.id;
  const newSessionAt = localCentralToUtcIso(dateCentral, timeCentral);
  const startMs = new Date(newSessionAt).getTime();
  const endMs = startMs + booking.duration_minutes * 60_000;
  const endIso = new Date(endMs).toISOString();

  // Overlap guard against other live sessions.
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id, session_at, duration_minutes")
    .not("session_at", "is", null)
    .not("workflow_status", "in", "(cancelled,no_show)")
    .neq("id", bookingId)
    .gte("session_at", new Date(startMs - 8 * 60 * 60_000).toISOString())
    .lte("session_at", endIso);
  const overlaps = (conflicts ?? []).some((b) => {
    if (!b.session_at) return false;
    const bStart = new Date(b.session_at).getTime();
    const bEnd = bStart + (b.duration_minutes ?? 60) * 60_000;
    return bStart < endMs && bEnd > startMs;
  });
  if (overlaps) return { error: "That time overlaps another session." };

  // Move (or create) the calendar event.
  const client = await resolveClient(supabase, booking);
  let meetLink = booking.meet_link;
  let calendarEventId = booking.calendar_event_id;
  let meetPending = false;

  if (booking.calendar_event_id) {
    const moved = await updateCalendarEvent(booking.calendar_event_id, { startIso: newSessionAt, endIso });
    if (!moved) {
      // In-place move failed — create a fresh event, then delete the old one so
      // two events can't coexist at different times. If the create also fails,
      // keep the old id so a later cancel/retry can still clean it up.
      const created = await tryCreateEvent(booking, client.email, client.name, newSessionAt, endIso);
      if (created) {
        await deleteCalendarEvent(booking.calendar_event_id);
        meetLink = created.meetLink;
        calendarEventId = created.eventId;
      } else {
        meetPending = booking.location_type === "google_meet";
      }
    }
  } else {
    const created = await tryCreateEvent(booking, client.email, client.name, newSessionAt, endIso);
    if (created) {
      meetLink = created.meetLink;
      calendarEventId = created.eventId;
    } else {
      meetPending = booking.location_type === "google_meet";
    }
  }

  // Update the session record + reset reminder idempotency so they re-fire.
  await supabase
    .from("bookings")
    .update({
      session_at: newSessionAt,
      meet_link: meetLink,
      calendar_event_id: calendarEventId,
      meet_link_pending: meetPending,
      session_reminder_sent_at: null,
      reminder_1h_sent_at: null,
      prep_summary_sent_at: null,
      workflow_status: (booking.workflow_status === "completed" ||
      booking.workflow_status === "follow_up_sent"
        ? "session_scheduled"
        : booking.workflow_status) as WorkflowStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  // The *_sent_at reset above only half-arms the reminders: sendTemplated also
  // skips when an automation_log success row for the event already exists
  // (UNIQUE(event_key, booking_id)). Clear those rows so the new time's
  // reminders actually re-fire.
  await supabase
    .from("automation_log")
    .delete()
    .eq("booking_id", bookingId)
    .in("event_key", ["session_reminder_24h_sent", "session_reminder_1h_sent", "prep_summary_sent"]);

  // Re-confirm to the client (non-idempotent — this is a deliberate re-send).
  if (client.email) {
    await sendTemplated("session_confirmed", {
      to: client.email,
      bookingId,
      clientId: booking.client_id ?? undefined,
      eventKey: "session_rescheduled_sent",
      idempotent: false,
      data: {
        client_name: client.name || "there",
        service_type: booking.service_type,
        session_date: formatCentralDate(newSessionAt),
        session_time: formatCentralTime(newSessionAt),
        session_length: formatDuration(booking.duration_minutes),
        meeting_type: meetingTypeLabel(booking.location_type),
        meeting_location: meetingLocationLine(booking.location_type, booking.location_details),
        meet_link: meetLink ?? "",
        session_workspace_url: booking.client_id ? `${APP_URL}/dashboard/sessions/${bookingId}` : "",
      },
    });
  }

  revalidateSession(booking.client_id);
  return { success: true };
}

/** Admin: reschedule any session. */
export async function rescheduleSession(
  bookingId: string,
  dateCentral: string,
  timeCentral: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };
  if (booking.workflow_status === "cancelled") return { error: "This session was cancelled." };
  return performReschedule(supabase, booking, dateCentral, timeCentral);
}

async function tryCreateEvent(
  booking: SessionBooking,
  email: string | null,
  name: string,
  startIso: string,
  endIso: string
): Promise<{ eventId: string; meetLink: string | null } | null> {
  try {
    const result = await createCalendarEvent({
      bookingId: booking.id,
      serviceType: booking.service_type,
      clientName: name || email || "Client",
      clientEmail: email ?? "",
      clientNotes: null,
      startIso,
      endIso,
      appUrl: APP_URL,
      clientId: booking.client_id,
      locationType: booking.location_type as LocationType,
      locationDetails: booking.location_details,
    });
    return result ? { eventId: result.eventId, meetLink: result.meetLink } : null;
  } catch {
    return null;
  }
}

/** Manually send the client the "starting soon" reminder right now. */
export async function sendSessionReminderNow(
  bookingId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };
  if (!booking.session_at) return { error: "This session has no scheduled time yet." };
  const client = await resolveClient(supabase, booking);
  if (!client.email) return { error: "No client email on file for this session." };

  const result = await sendTemplated("session_reminder_1h", {
    to: client.email,
    bookingId,
    clientId: booking.client_id ?? undefined,
    eventKey: "manual_reminder_sent",
    idempotent: false,
    data: {
      client_name: client.name?.split(" ")[0] || "there",
      session_date: formatCentralDate(booking.session_at),
      session_time: formatCentralTime(booking.session_at),
      meeting_type: meetingTypeLabel(booking.location_type),
      meet_link: booking.meet_link ?? "",
      meeting_location: meetingLocationLine(booking.location_type, booking.location_details),
      session_workspace_url: booking.client_id ? `${APP_URL}/dashboard/sessions/${bookingId}` : "",
    },
  });
  if (!result.sent && result.error) return { error: `Email failed: ${result.error}` };
  // Suppress the cron's automatic T-1h reminder so the client isn't emailed twice.
  if (result.sent) {
    await supabase
      .from("bookings")
      .update({ reminder_1h_sent_at: new Date().toISOString() })
      .eq("id", bookingId);
  }
  return { success: true };
}

/** Cancel a session: mark cancelled, remove the calendar event, return any
 * package credit. Auth/ownership is the caller's responsibility. */
async function performCancel(
  supabase: Svc,
  booking: SessionBooking
): Promise<{ error?: string; success?: boolean }> {
  if (booking.calendar_event_id) {
    await deleteCalendarEvent(booking.calendar_event_id);
  }
  await supabase
    .from("bookings")
    .update({
      workflow_status: "cancelled",
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);
  await returnPackageCredit(supabase, booking.session_package_id);
  revalidateSession(booking.client_id);
  return { success: true };
}

/** Admin: cancel any session. */
export async function cancelSession(
  bookingId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };
  return performCancel(supabase, booking);
}

// ─── Client self-service (ownership + >24h notice) ──────────────────────────

async function notifyClientChange(
  supabase: Svc,
  booking: SessionBooking,
  action: "rescheduled" | "cancelled",
  detail?: string
): Promise<void> {
  const client = await resolveClient(supabase, booking);
  await notifyAdmin({
    type: "new_booking",
    subject: `Client ${action} a session: ${client.name || client.email || "client"}`,
    title: `Client ${action} their session`,
    body: `${booking.service_type}${detail ? ` · ${detail}` : ""}`,
    link: booking.client_id
      ? `/admin/clients/${booking.client_id}#booking-${booking.id}`
      : "/admin/sessions",
    ctaLabel: "Open session",
    replyTo: client.email ?? undefined,
    bookingId: booking.id,
    clientId: booking.client_id,
  });
}

async function loadOwnSession(
  bookingId: string
): Promise<{ error: string } | { supabase: Svc; booking: SessionBooking }> {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking || booking.client_id !== user.id) return { error: "Session not found." };
  if (booking.workflow_status === "cancelled") return { error: "This session was already cancelled." };
  if (!canSelfModify(booking.session_at)) {
    return {
      error: "Sessions can only be changed more than 24 hours in advance. Reply to Rachel's email and she'll help.",
    };
  }
  return { supabase, booking };
}

/** Client: reschedule their own session (>24h out). */
export async function clientRescheduleSession(
  bookingId: string,
  dateCentral: string,
  timeCentral: string
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await loadOwnSession(bookingId);
  if ("error" in ctx) return { error: ctx.error };
  const res = await performReschedule(ctx.supabase, ctx.booking, dateCentral, timeCentral);
  if (res.success) {
    revalidatePath(`/dashboard/sessions/${bookingId}`);
    await notifyClientChange(ctx.supabase, ctx.booking, "rescheduled", `${dateCentral} ${timeCentral} CT`);
  }
  return res;
}

/** Client: cancel their own session (>24h out). */
export async function clientCancelSession(
  bookingId: string
): Promise<{ error?: string; success?: boolean }> {
  const ctx = await loadOwnSession(bookingId);
  if ("error" in ctx) return { error: ctx.error };
  const res = await performCancel(ctx.supabase, ctx.booking);
  if (res.success) {
    revalidatePath(`/dashboard/sessions/${bookingId}`);
    revalidatePath("/dashboard/bookings");
    await notifyClientChange(ctx.supabase, ctx.booking, "cancelled");
  }
  return res;
}
