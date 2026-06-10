// Shared session-creation core + the invitation-finalize wrapper.
//
// createSessionBooking() is the single path that turns a confirmed intent into a
// real session (a `bookings` row) WITHOUT charging: it resolves the client by
// email, guards against double-booking, inserts the booking, records a payment
// (only when money changed hands), creates the Google Calendar event
// (Meet/phone/in-person/custom), and sends the client + admin emails and the
// admin bell. Callers:
//   • finalizeSession()    — booking invitations (free accept + paid webhook)
//   • redeemPackageCredit() — multi-session package credits (no new payment)
//
// Posture: best-effort calendar/email (never block the booking), idempotent on
// stripe_session_id / booking_invitation_id, client profile linked by email.

import { createServiceClient } from "@/lib/supabase/service";
import { createCalendarEvent } from "@/lib/google/calendar";
import { createAdminNotification } from "@/lib/notifications/admin";
import { sendTemplated } from "@/lib/email/render";
import { formatCentralDate, formatCentralTime } from "@/lib/time/central";
import { meetingTypeLabel, meetingLocationLine, formatDuration } from "@/lib/booking/display";
import type { LocationType, PaymentStatus, AdminNotificationType } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "hello@thryvegrowth.co";

export interface CreateSessionBookingArgs {
  serviceType: string;
  serviceKey: string | null;
  sessionType: string | null;
  /** Central wall-clock → UTC ISO. */
  sessionAtUtc: string;
  durationMinutes: number;
  locationType: LocationType;
  locationDetails: string | null;
  clientId: string | null;
  clientEmail: string;
  clientName: string;
  paymentStatus: PaymentStatus;
  amountCents: number | null;
  workflowStatus?: "session_scheduled" | "intake_needed";
  slotId?: string | null;
  bookingInvitationId?: string | null;
  sessionPackageId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  /** Admin bell type. Defaults to "session_booked_via_invite". */
  adminNotifyType?: AdminNotificationType;
}

export type CreateSessionBookingResult =
  | { bookingId: string; clientId: string | null }
  | { error: string };

export async function createSessionBooking(
  args: CreateSessionBookingArgs
): Promise<CreateSessionBookingResult> {
  const supabase = createServiceClient();

  // ─── Resolve client account by email (links to portal if they have one) ──
  let clientId = args.clientId ?? null;
  if (!clientId && args.clientEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", args.clientEmail)
      .limit(1)
      .maybeSingle();
    clientId = (profile as { id: string } | null)?.id ?? null;
  }

  // ─── Double-booking guard ────────────────────────────────────────────────
  const startMs = new Date(args.sessionAtUtc).getTime();
  const endMs = startMs + args.durationMinutes * 60_000;
  const endIso = new Date(endMs).toISOString();
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id, session_at, duration_minutes")
    .not("session_at", "is", null)
    .not("workflow_status", "in", "(cancelled,no_show)")
    // Any session starting up to 8h before could still overlap a long meeting.
    .gte("session_at", new Date(startMs - 8 * 60 * 60_000).toISOString())
    .lte("session_at", endIso);
  const overlaps = (conflicts ?? []).some((b) => {
    if (!b.session_at) return false;
    const bStart = new Date(b.session_at).getTime();
    const bEnd = bStart + (b.duration_minutes ?? 60) * 60_000;
    return bStart < endMs && bEnd > startMs;
  });
  if (overlaps) return { error: "That time is no longer available." };

  // ─── Create the session record ───────────────────────────────────────────
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: clientId,
      slot_id: args.slotId ?? null,
      service_type: args.serviceType,
      service_key: args.serviceKey,
      session_type: args.sessionType,
      status: "confirmed",
      workflow_status: args.workflowStatus ?? "session_scheduled",
      session_at: args.sessionAtUtc,
      duration_minutes: args.durationMinutes,
      location_type: args.locationType,
      location_details: args.locationDetails,
      payment_status: args.paymentStatus,
      amount_cents: args.amountCents,
      stripe_session_id: args.stripeSessionId ?? null,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
      booking_invitation_id: args.bookingInvitationId ?? null,
      session_package_id: args.sessionPackageId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    // A unique violation on booking_invitation_id / stripe_session_id means a
    // concurrent accept or a duplicate webhook already created this session —
    // treat it as idempotent and return the existing one.
    if (bookingError?.code === "23505") {
      if (args.bookingInvitationId) {
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("booking_invitation_id", args.bookingInvitationId)
          .maybeSingle();
        if (existing) return { bookingId: existing.id, clientId };
      }
      if (args.stripeSessionId) {
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("stripe_session_id", args.stripeSessionId)
          .maybeSingle();
        if (existing) return { bookingId: existing.id, clientId };
      }
    }
    console.error("[createSessionBooking] Failed to create booking:", bookingError);
    return { error: "Could not create the session. Please try again." };
  }

  // Record the payment when money actually changed hands.
  if (args.paymentStatus === "paid") {
    await supabase.from("payments").insert({
      client_id: clientId,
      booking_id: booking.id,
      stripe_payment_intent_id: args.stripePaymentIntentId ?? null,
      amount_cents: args.amountCents ?? 0,
      status: "paid",
      service_type: args.serviceType,
    });
  }

  // ─── Google Calendar event (best-effort) ─────────────────────────────────
  let meetLink: string | null = null;
  let calendarLink: string | null = null;
  try {
    const eventResult = await createCalendarEvent({
      bookingId: booking.id,
      serviceType: args.serviceType,
      clientName: args.clientName || args.clientEmail,
      clientEmail: args.clientEmail,
      clientNotes: null,
      startIso: args.sessionAtUtc,
      endIso,
      appUrl: APP_URL,
      clientId,
      locationType: args.locationType,
      locationDetails: args.locationDetails,
    });
    if (eventResult) {
      meetLink = eventResult.meetLink;
      calendarLink = eventResult.htmlLink;
      await supabase
        .from("bookings")
        .update({
          meet_link: eventResult.meetLink,
          calendar_event_id: eventResult.eventId,
          meet_link_pending: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
      await supabase.from("automation_log").upsert(
        {
          event_key: "calendar_event_created",
          booking_id: booking.id,
          client_id: clientId,
          status: "success",
          payload: { event_id: eventResult.eventId, meet_link: eventResult.meetLink },
        },
        { onConflict: "event_key,booking_id" }
      );
    } else {
      if (args.locationType === "google_meet") {
        await supabase
          .from("bookings")
          .update({ meet_link_pending: true, updated_at: new Date().toISOString() })
          .eq("id", booking.id);
      }
      await supabase.from("automation_log").upsert(
        {
          event_key: "calendar_event_failed",
          booking_id: booking.id,
          client_id: clientId,
          status: "failed",
          error_message: "Calendar API returned no event (likely not connected or auth expired).",
        },
        { onConflict: "event_key,booking_id" }
      );
    }
  } catch (err) {
    if (args.locationType === "google_meet") {
      await supabase
        .from("bookings")
        .update({ meet_link_pending: true, updated_at: new Date().toISOString() })
        .eq("id", booking.id);
    }
    await supabase.from("automation_log").upsert(
      {
        event_key: "calendar_event_failed",
        booking_id: booking.id,
        client_id: clientId,
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      },
      { onConflict: "event_key,booking_id" }
    );
  }

  // ─── Notifications + emails ──────────────────────────────────────────────
  const sessionDate = formatCentralDate(args.sessionAtUtc);
  const sessionTime = formatCentralTime(args.sessionAtUtc);
  const sessionLength = formatDuration(args.durationMinutes);
  const meetingType = meetingTypeLabel(args.locationType);
  const meetingLocation = meetingLocationLine(args.locationType, args.locationDetails);
  const sessionWorkspaceUrl = clientId ? `${APP_URL}/dashboard/sessions/${booking.id}` : "";
  const adminSessionUrl = clientId
    ? `${APP_URL}/admin/clients/${clientId}#booking-${booking.id}`
    : `${APP_URL}/admin/sessions`;

  await createAdminNotification({
    type: args.adminNotifyType ?? "session_booked_via_invite",
    title: `Session booked: ${args.clientName || args.clientEmail || "Unknown client"}`,
    body: `${args.serviceType} · ${sessionDate} at ${sessionTime}`,
    link: clientId ? `/admin/clients/${clientId}#booking-${booking.id}` : `/admin/sessions`,
    bookingId: booking.id,
    clientId,
  });

  await Promise.allSettled([
    sendTemplated("session_confirmed", {
      to: args.clientEmail,
      bookingId: booking.id,
      clientId: clientId ?? undefined,
      idempotent: true,
      data: {
        client_name: args.clientName || "there",
        service_type: args.serviceType,
        session_date: sessionDate,
        session_time: sessionTime,
        session_length: sessionLength,
        meeting_type: meetingType,
        meeting_location: meetingLocation,
        meet_link: meetLink ?? "",
        session_workspace_url: sessionWorkspaceUrl,
      },
    }),
    sendTemplated("new_session_booked", {
      to: ADMIN_EMAIL,
      bookingId: booking.id,
      clientId: clientId ?? undefined,
      idempotent: true,
      eventKey: "new_session_booked_admin_sent",
      gateKey: "admin_email:new_session_booked",
      data: {
        client_name: args.clientName || args.clientEmail,
        client_email: args.clientEmail,
        service_type: args.serviceType,
        session_type: args.sessionType ?? "",
        session_date: sessionDate,
        session_time: sessionTime,
        session_length: sessionLength,
        meeting_type: meetingType,
        client_notes: "",
        admin_session_url: adminSessionUrl,
        calendar_link: calendarLink ?? "",
      },
    }),
  ]);

  return { bookingId: booking.id, clientId };
}

// ─── Invitation finalize wrapper ───────────────────────────────────────────

export interface FinalizeSessionArgs {
  source: "invitation_free" | "invitation_paid";
  invitationId: string;
  optionId: string;
  sessionAtUtc: string;
  durationMinutes: number;
  locationType: LocationType;
  locationDetails: string | null;
  serviceType: string;
  serviceKey: string | null;
  sessionType: string | null;
  clientId: string | null;
  clientEmail: string;
  clientName: string;
  paymentStatus: PaymentStatus;
  amountCents: number | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}

export type FinalizeSessionResult = { bookingId: string } | { error: string };

export async function finalizeSession(args: FinalizeSessionArgs): Promise<FinalizeSessionResult> {
  const supabase = createServiceClient();

  // ─── Idempotency ─────────────────────────────────────────────────────────
  if (args.stripeSessionId) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("stripe_session_id", args.stripeSessionId)
      .maybeSingle();
    if (existing) return { bookingId: existing.id };
  }

  const { data: invitation } = await supabase
    .from("booking_invitations")
    .select("id, booking_id, client_id")
    .eq("id", args.invitationId)
    .maybeSingle();
  if (!invitation) return { error: "Invitation not found." };
  if (invitation.booking_id) return { bookingId: invitation.booking_id };

  // ─── Create the session via the shared core ──────────────────────────────
  const result = await createSessionBooking({
    serviceType: args.serviceType,
    serviceKey: args.serviceKey,
    sessionType: args.sessionType,
    sessionAtUtc: args.sessionAtUtc,
    durationMinutes: args.durationMinutes,
    locationType: args.locationType,
    locationDetails: args.locationDetails,
    clientId: args.clientId ?? invitation.client_id ?? null,
    clientEmail: args.clientEmail,
    clientName: args.clientName,
    paymentStatus: args.paymentStatus,
    amountCents: args.amountCents,
    workflowStatus: "session_scheduled",
    bookingInvitationId: args.invitationId,
    stripeSessionId: args.stripeSessionId,
    stripePaymentIntentId: args.stripePaymentIntentId,
    adminNotifyType: "session_booked_via_invite",
  });
  if ("error" in result) return { error: result.error };

  // ─── Stamp the invitation + consume the chosen option ────────────────────
  await supabase
    .from("booking_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_option_id: args.optionId,
      booking_id: result.bookingId,
      client_id: result.clientId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.invitationId);
  await supabase
    .from("booking_invitation_options")
    .update({ status: "consumed" })
    .eq("id", args.optionId);
  await supabase
    .from("booking_invitation_options")
    .update({ status: "withdrawn" })
    .eq("invitation_id", args.invitationId)
    .neq("id", args.optionId)
    .in("status", ["open", "reserved"]);

  return { bookingId: result.bookingId };
}
