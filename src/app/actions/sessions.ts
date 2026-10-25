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
  locationLabel,
  type CalendarLocationType,
} from "@/lib/google/calendar";
import { createSessionBooking } from "@/lib/booking/finalize";
import { localCentralToUtcIso, formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { sendTemplated } from "@/lib/email/render";
import { renderShell } from "@/lib/email/shell";
import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from "@/lib/email/resend";
import { meetingTypeLabel, meetingLocationLine, formatDuration, type LocationType } from "@/lib/booking/display";
import type { WorkflowStatus, PaymentStatus, Database } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Duration bounds for admin-entered sessions (5 min … 8 hours).
const MIN_DURATION = 5;
const MAX_DURATION = 8 * 60;

const ALLOWED_LOCATION_TYPES = ["google_meet", "phone", "in_person", "custom"] as const;
const ALLOWED_WORKFLOW_STATUSES = [
  "intake_needed",
  "intake_complete",
  "session_scheduled",
  "completed",
  "follow_up_sent",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;
const ALLOWED_PAYMENT_STATUSES = ["not_required", "pending", "paid", "refunded", "waived"] as const;

/** Legacy `status` column kept in sync with `workflow_status` on every edit. */
function legacyStatusFor(workflow: string): "pending" | "confirmed" | "completed" | "cancelled" {
  if (workflow === "cancelled") return "cancelled";
  if (workflow === "completed" || workflow === "follow_up_sent") return "completed";
  return "confirmed";
}

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
  timeCentral: string,
  opts: { notifyClient?: boolean } = {}
): Promise<{ error?: string; success?: boolean }> {
  const notifyClient = opts.notifyClient !== false;
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
  if (notifyClient && client.email) {
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

/** Send the client a plain branded "your session was cancelled" email. */
async function sendCancellationEmail(supabase: Svc, booking: SessionBooking): Promise<void> {
  const client = await resolveClient(supabase, booking);
  if (!client.email) return;
  const firstName = client.name ? client.name.split(" ")[0] : "";
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const when = booking.session_at
    ? ` on ${formatCentralDate(booking.session_at)} at ${formatCentralTime(booking.session_at)} CT`
    : "";
  const inner = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">Your session${when} has been cancelled. Reply to this email if you'd like to find a new time.</p>
    <p style="margin:0;">Thank you,<br>Rachel</p>`;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: client.email,
      replyTo: REPLY_TO_EMAIL,
      subject: "Your session has been cancelled",
      html: renderShell(inner),
    });
  } catch (err) {
    console.error("[cancelSession] cancellation email failed:", err);
  }
}

/** Admin: cancel any session. Optionally email the client. */
export async function cancelSession(
  bookingId: string,
  opts: { notifyClient?: boolean } = {}
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };
  const res = await performCancel(supabase, booking);
  if (res.success && opts.notifyClient) {
    await sendCancellationEmail(supabase, booking);
  }
  return res;
}

// ─── Admin create / edit / reassign ─────────────────────────────────────────

export interface AdminCreateSessionInput {
  /** Existing client profile id. Omit for a non-account client (use email+name). */
  clientId?: string | null;
  clientEmail?: string;
  clientName?: string;
  /** Display label, e.g. "Career & Leadership Coaching". */
  serviceType: string;
  /** Optional known ServiceKey (from products.ts) or null for free text. */
  serviceKey?: string | null;
  sessionType?: string | null;
  dateCentral: string;
  timeCentral: string;
  durationMinutes: number;
  locationType: string;
  locationDetails?: string | null;
  paymentStatus: string;
  amountCents?: number | null;
  adminNotes?: string | null;
  /** Email the client the confirmation. Opt-in — unchecked by default in the UI. */
  sendConfirmation: boolean;
}

/** Admin: create a session (a bookings row) directly, without a Stripe charge. */
export async function adminCreateSession(
  input: AdminCreateSessionInput
): Promise<{ error?: string; success?: boolean; bookingId?: string; clientId?: string | null }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();

  const serviceType = (input.serviceType ?? "").trim();
  if (!serviceType) return { error: "Pick or enter a service." };
  if (!DATE_RE.test(input.dateCentral) || !TIME_RE.test(input.timeCentral)) {
    return { error: "Pick a valid date and time." };
  }
  const duration = Number(input.durationMinutes);
  if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
    return { error: "Enter a duration between 5 minutes and 8 hours." };
  }
  if (!(ALLOWED_LOCATION_TYPES as readonly string[]).includes(input.locationType)) {
    return { error: "Pick a valid meeting type." };
  }
  if (!(ALLOWED_PAYMENT_STATUSES as readonly string[]).includes(input.paymentStatus)) {
    return { error: "Pick a valid payment status." };
  }
  const amountCents = input.amountCents ?? null;
  if (amountCents !== null && (!Number.isInteger(amountCents) || amountCents < 0)) {
    return { error: "Enter a valid amount." };
  }

  // Resolve the client: an existing profile (name/email from the profile) or a
  // non-account client (name/email typed in).
  const clientId = input.clientId?.trim() || null;
  let clientEmail = (input.clientEmail ?? "").trim();
  let clientName = (input.clientName ?? "").trim();
  if (clientId) {
    const { data } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", clientId)
      .maybeSingle();
    const p = data as { email: string; full_name: string | null } | null;
    if (!p) return { error: "That client account was not found." };
    clientEmail = p.email;
    clientName = p.full_name ?? "";
  } else {
    if (!EMAIL_RE.test(clientEmail)) return { error: "Enter the client's email." };
    if (!clientName) return { error: "Enter the client's name." };
  }

  const sessionAtUtc = localCentralToUtcIso(input.dateCentral, input.timeCentral);

  const result = await createSessionBooking({
    serviceType,
    serviceKey: input.serviceKey?.trim() || null,
    sessionType: input.sessionType?.trim() || null,
    sessionAtUtc,
    durationMinutes: duration,
    locationType: input.locationType as LocationType,
    locationDetails: input.locationDetails?.trim() || null,
    clientId,
    clientEmail,
    clientName,
    paymentStatus: input.paymentStatus as PaymentStatus,
    amountCents,
    adminNotes: input.adminNotes?.trim() || null,
    // Rachel is creating this herself — no need to bell/email herself.
    sendAdminNotifications: false,
    // Client confirmation is opt-in.
    sendClientEmail: input.sendConfirmation === true,
  });
  if ("error" in result) return { error: result.error };

  revalidateSession(result.clientId);
  return { success: true, bookingId: result.bookingId, clientId: result.clientId };
}

export interface AdminUpdateSessionPatch {
  serviceType?: string;
  serviceKey?: string | null;
  sessionType?: string | null;
  dateCentral?: string;
  timeCentral?: string;
  durationMinutes?: number;
  locationType?: string;
  locationDetails?: string | null;
  /** Manual Meet/link override — clears the "link needed" flag. */
  meetLink?: string | null;
  paymentStatus?: string;
  workflowStatus?: string;
  amountCents?: number | null;
  adminNotes?: string | null;
  /** Only honored when the time changes: send the client a reschedule email. */
  notifyClient?: boolean;
}

/** Admin: edit any field on a session. Time changes route through the shared
 * reschedule path; location/duration changes reconcile the calendar event. */
export async function adminUpdateSession(
  bookingId: string,
  patch: AdminUpdateSessionPatch
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };

  // ── Column changes (everything except the time move) ──
  const update: Record<string, unknown> = {};

  if (patch.serviceType !== undefined) {
    const s = patch.serviceType.trim();
    if (!s) return { error: "Service can't be empty." };
    update.service_type = s;
  }
  if (patch.serviceKey !== undefined) update.service_key = patch.serviceKey?.trim() || null;
  if (patch.sessionType !== undefined) update.session_type = patch.sessionType?.trim() || null;

  if (patch.durationMinutes !== undefined) {
    const d = Number(patch.durationMinutes);
    if (!Number.isInteger(d) || d < MIN_DURATION || d > MAX_DURATION) {
      return { error: "Enter a duration between 5 minutes and 8 hours." };
    }
    update.duration_minutes = d;
  }
  if (patch.locationType !== undefined) {
    if (!(ALLOWED_LOCATION_TYPES as readonly string[]).includes(patch.locationType)) {
      return { error: "Pick a valid meeting type." };
    }
    update.location_type = patch.locationType;
  }
  if (patch.locationDetails !== undefined) {
    update.location_details = patch.locationDetails?.trim() || null;
  }
  if (patch.meetLink !== undefined) {
    update.meet_link = patch.meetLink?.trim() || null;
    update.meet_link_pending = false; // a manual link resolves the pending state
  }
  if (patch.paymentStatus !== undefined) {
    if (!(ALLOWED_PAYMENT_STATUSES as readonly string[]).includes(patch.paymentStatus)) {
      return { error: "Pick a valid payment status." };
    }
    update.payment_status = patch.paymentStatus;
  }
  if (patch.amountCents !== undefined) {
    if (patch.amountCents !== null && (!Number.isInteger(patch.amountCents) || patch.amountCents < 0)) {
      return { error: "Enter a valid amount." };
    }
    update.amount_cents = patch.amountCents;
  }
  if (patch.adminNotes !== undefined) update.admin_notes = patch.adminNotes?.trim() || null;

  if (patch.workflowStatus !== undefined) {
    if (!(ALLOWED_WORKFLOW_STATUSES as readonly string[]).includes(patch.workflowStatus)) {
      return { error: "Pick a valid status." };
    }
    update.workflow_status = patch.workflowStatus;
    if (patch.workflowStatus === "completed") update.completed_at = new Date().toISOString();
    update.status = legacyStatusFor(patch.workflowStatus); // keep legacy column in sync
  }

  const hasColumnChanges = Object.keys(update).length > 0;
  if (hasColumnChanges) {
    update.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update(update as Database["public"]["Tables"]["bookings"]["Update"])
      .eq("id", bookingId);
    if (error) return { error: error.message };
  }

  // ── Time change → reschedule (moves the calendar event, resets reminders) ──
  const timeChange = patch.dateCentral !== undefined && patch.timeCentral !== undefined;
  if (timeChange) {
    if (!DATE_RE.test(patch.dateCentral as string) || !TIME_RE.test(patch.timeCentral as string)) {
      return { error: "Pick a valid date and time." };
    }
    // Reload so the reschedule sees the just-saved duration/location/service.
    const fresh = (await loadBooking(supabase, bookingId)) ?? booking;
    const res = await performReschedule(
      supabase,
      fresh,
      patch.dateCentral as string,
      patch.timeCentral as string,
      { notifyClient: patch.notifyClient === true }
    );
    if (res.error) return res;
  }

  // ── Reconcile the calendar event for logistics performReschedule skips:
  // location (always), and the end time when only the duration changed. ──
  const locationChanged = patch.locationType !== undefined || patch.locationDetails !== undefined;
  const durationChanged = patch.durationMinutes !== undefined;
  if (locationChanged || (durationChanged && !timeChange)) {
    const fresh = await loadBooking(supabase, bookingId);
    if (fresh?.calendar_event_id) {
      const calPatch: { location?: string; endIso?: string } = {};
      if (locationChanged) {
        calPatch.location =
          locationLabel(fresh.location_type as CalendarLocationType, fresh.location_details) ?? "";
      }
      if (durationChanged && !timeChange && fresh.session_at) {
        calPatch.endIso = new Date(
          new Date(fresh.session_at).getTime() + fresh.duration_minutes * 60_000
        ).toISOString();
      }
      if (Object.keys(calPatch).length > 0) {
        await updateCalendarEvent(fresh.calendar_event_id, calPatch);
      }
    }
  }

  revalidateSession(booking.client_id);
  return { success: true };
}

/** Admin: move a session to a different client. Upcoming, non-cancelled only. */
export async function adminReassignClient(
  bookingId: string,
  clientId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };
  if (booking.workflow_status === "cancelled") return { error: "This session was cancelled." };
  if (!booking.session_at || new Date(booking.session_at).getTime() <= Date.now()) {
    return { error: "Only upcoming sessions can be reassigned." };
  }
  const targetId = clientId?.trim();
  if (!targetId) return { error: "Pick a client." };
  if (targetId === booking.client_id) return { error: "That's already the client on this session." };

  const { data } = await supabase.from("profiles").select("id, role").eq("id", targetId).maybeSingle();
  const p = data as { id: string; role: string } | null;
  if (!p || p.role !== "client") return { error: "Pick a valid client account." };

  const { error } = await supabase
    .from("bookings")
    .update({ client_id: targetId, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  if (booking.client_id) revalidatePath(`/admin/clients/${booking.client_id}`);
  revalidatePath(`/admin/clients/${targetId}`);
  return { success: true };
}

/**
 * Admin: permanently delete a session. For test or duplicate rows only — real
 * sessions should be cancelled (keeps the record). Requires a typed "DELETE"
 * confirmation and refuses when a payment is on record.
 */
export async function adminDeleteSession(
  bookingId: string,
  confirmText: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };
  if (confirmText !== "DELETE") return { error: "Type DELETE to confirm." };
  const supabase = createServiceClient();
  const booking = await loadBooking(supabase, bookingId);
  if (!booking) return { error: "Session not found." };

  // Refuse when money is on record — those should be cancelled/refunded, not erased.
  const { data: pay } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .limit(1)
    .maybeSingle();
  if (pay) return { error: "This session has a payment on record. Cancel it instead of deleting." };

  // Remove the calendar event + return any package credit.
  if (booking.calendar_event_id) await deleteCalendarEvent(booking.calendar_event_id);
  await returnPackageCredit(supabase, booking.session_package_id);

  // Clear dependent rows that FK to bookings. intake_responses + automation_log
  // are ON DELETE CASCADE, but delete them explicitly so behavior doesn't rely
  // silently on the constraint. Rows that SET NULL on delete (client_messages,
  // testimonials, admin_tasks, admin_notifications, booking_invitations) are
  // left intact and simply unlink.
  await supabase.from("intake_responses").delete().eq("booking_id", bookingId);
  await supabase.from("automation_log").delete().eq("booking_id", bookingId);

  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (error) return { error: error.message };

  revalidateSession(booking.client_id);
  return { success: true };
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
    revalidatePath("/dashboard/sessions");
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
    revalidatePath("/dashboard/sessions");
    await notifyClientChange(ctx.supabase, ctx.booking, "cancelled");
  }
  return res;
}
