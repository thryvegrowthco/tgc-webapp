"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";
import { sendTemplated } from "@/lib/email/render";
import { localCentralToUtcIso } from "@/lib/time/central";
import { finalizeSession } from "@/lib/booking/finalize";
import { meetingTypeLabel, formatDuration, type LocationType } from "@/lib/booking/display";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOCATION_TYPES: LocationType[] = ["google_meet", "phone", "in_person", "custom"];
const MAX_OPTIONS = 25;

export interface InvitationOptionInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h, Central)
}

export interface CreateBookingInvitationPayload {
  clientId?: string | null;
  clientEmail: string;
  clientName?: string | null;
  serviceType: string;
  serviceKey?: string | null;
  sessionType?: string | null;
  durationMinutes: number;
  locationType: LocationType;
  locationDetails?: string | null;
  requiresPayment: boolean;
  amountCents?: number | null;
  customMessage?: string | null;
  internalNotes?: string | null;
  expiresAt?: string | null; // ISO or null
  options: InvitationOptionInput[];
  /** When true, email the client immediately after creating. */
  sendNow?: boolean;
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function createBookingInvitation(
  payload: CreateBookingInvitationPayload
): Promise<{ error?: string; id?: string; token?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const email = (payload.clientEmail ?? "").trim();
  if (!isEmail(email)) return { error: "Enter a valid client email." };
  if (!payload.serviceType?.trim()) return { error: "Service type is required." };
  if (!LOCATION_TYPES.includes(payload.locationType)) return { error: "Pick a valid meeting type." };
  if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes < 15 || payload.durationMinutes > 480) {
    return { error: "Session length must be between 15 and 480 minutes." };
  }
  if (!Array.isArray(payload.options) || payload.options.length === 0) {
    return { error: "Add at least one date and time option." };
  }
  if (payload.options.length > MAX_OPTIONS) {
    return { error: `Too many options (max ${MAX_OPTIONS}).` };
  }
  if (payload.requiresPayment && (!payload.amountCents || payload.amountCents < 50)) {
    return { error: "Set a payment amount of at least $0.50 for paid invitations." };
  }

  // Validate + de-dupe options, compute the UTC moment for each.
  const seen = new Set<string>();
  const optionRows: { slot_date: string; start_time: string; session_at: string }[] = [];
  for (const opt of payload.options) {
    if (!DATE_RE.test(opt.date)) return { error: `Invalid date: ${opt.date}` };
    if (!TIME_RE.test(opt.time)) return { error: `Invalid time: ${opt.time}` };
    const sessionAt = localCentralToUtcIso(opt.date, opt.time);
    if (seen.has(sessionAt)) continue; // skip duplicate date/time
    seen.add(sessionAt);
    optionRows.push({ slot_date: opt.date, start_time: opt.time, session_at: sessionAt });
  }
  if (optionRows.length === 0) return { error: "Add at least one valid date and time option." };

  const supabase = createServiceClient();

  const { data: invitation, error: invErr } = await supabase
    .from("booking_invitations")
    .insert({
      client_id: payload.clientId || null,
      client_email: email,
      client_name: payload.clientName?.trim() || null,
      service_type: payload.serviceType.trim(),
      service_key: payload.serviceKey || null,
      session_type: payload.sessionType?.trim() || null,
      duration_minutes: Math.round(payload.durationMinutes),
      location_type: payload.locationType,
      location_details: payload.locationDetails?.trim() || null,
      requires_payment: payload.requiresPayment,
      amount_cents: payload.requiresPayment ? payload.amountCents ?? null : null,
      custom_message: payload.customMessage?.trim() || null,
      internal_notes: payload.internalNotes?.trim() || null,
      expires_at: payload.expiresAt || null,
      created_by: auth.userId,
    })
    .select("id, token")
    .single();

  if (invErr || !invitation) {
    return { error: invErr?.message ?? "Could not create the invitation." };
  }

  const { error: optErr } = await supabase
    .from("booking_invitation_options")
    .insert(optionRows.map((r) => ({ ...r, invitation_id: invitation.id })));
  if (optErr) {
    // Roll back the invitation so we never leave a parentless shell.
    await supabase.from("booking_invitations").delete().eq("id", invitation.id);
    return { error: optErr.message };
  }

  if (payload.sendNow) {
    const sent = await sendBookingInvitation(invitation.id);
    if (sent.error) return { error: sent.error, id: invitation.id, token: invitation.token };
  }

  revalidatePath("/admin/invitations");
  return { id: invitation.id, token: invitation.token };
}

export async function sendBookingInvitation(
  invitationId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const { data: inv } = await supabase
    .from("booking_invitations")
    .select("id, token, client_email, client_name, service_type, duration_minutes, location_type, custom_message, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { error: "Invitation not found." };
  if (inv.status === "accepted") return { error: "This invitation was already accepted." };
  if (inv.status === "cancelled") return { error: "This invitation was cancelled." };

  const result = await sendTemplated("booking_invitation", {
    to: inv.client_email,
    clientId: undefined,
    data: {
      client_name: inv.client_name || "there",
      booking_url: `${APP_URL}/book-session/${inv.token}`,
      custom_message: inv.custom_message ?? "",
      service_type: inv.service_type,
      session_length: formatDuration(inv.duration_minutes),
      meeting_type: meetingTypeLabel(inv.location_type),
    },
  });
  if (!result.sent && result.error) return { error: `Email failed: ${result.error}` };

  await supabase
    .from("booking_invitations")
    .update({ status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", invitationId);

  revalidatePath("/admin/invitations");
  return { success: true };
}

export async function cancelBookingInvitation(
  invitationId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const supabase = createServiceClient();
  const { data: inv } = await supabase
    .from("booking_invitations")
    .select("status")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { error: "Invitation not found." };
  if (inv.status === "accepted") return { error: "This invitation was already accepted." };

  await supabase
    .from("booking_invitations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", invitationId);
  await supabase
    .from("booking_invitation_options")
    .update({ status: "withdrawn" })
    .eq("invitation_id", invitationId)
    .in("status", ["open", "reserved"]);

  revalidatePath("/admin/invitations");
  return { success: true };
}

// ─── Public actions (no admin gate; the token is the bearer secret) ──────────

interface LoadedInvitation {
  id: string;
  status: string;
  expires_at: string | null;
  booking_id: string | null;
  requires_payment: boolean;
  amount_cents: number | null;
  stripe_price_id: string | null;
  service_type: string;
  service_key: string | null;
  session_type: string | null;
  duration_minutes: number;
  location_type: LocationType;
  location_details: string | null;
  client_id: string | null;
  client_email: string;
  client_name: string | null;
}

async function loadLiveInvitation(
  supabase: ReturnType<typeof createServiceClient>,
  token: string
): Promise<{ error?: string; invitation?: LoadedInvitation }> {
  const { data } = await supabase
    .from("booking_invitations")
    .select(
      "id, status, expires_at, booking_id, requires_payment, amount_cents, stripe_price_id, service_type, service_key, session_type, duration_minutes, location_type, location_details, client_id, client_email, client_name"
    )
    .eq("token", token)
    .maybeSingle();
  const inv = data as LoadedInvitation | null;
  if (!inv) return { error: "We couldn't find this booking link." };
  if (inv.status === "accepted" || inv.booking_id) return { error: "This invitation was already used." };
  if (inv.status === "cancelled") return { error: "This invitation is no longer available." };
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return { error: "This invitation has expired. Reply to Rachel's email for new times." };
  }
  return { invitation: inv };
}

/** Atomically reserve one option. Returns the option's session_at on success. */
async function reserveOption(
  supabase: ReturnType<typeof createServiceClient>,
  invitationId: string,
  optionId: string
): Promise<{ error?: string; sessionAt?: string }> {
  const { data } = await supabase
    .from("booking_invitation_options")
    .update({ status: "reserved", reserved_at: new Date().toISOString() })
    .eq("id", optionId)
    .eq("invitation_id", invitationId)
    .eq("status", "open")
    .select("session_at")
    .maybeSingle();
  if (!data) return { error: "That time was just taken. Please choose another." };
  return { sessionAt: data.session_at };
}

export async function acceptBookingInvitation(input: {
  token: string;
  optionId: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error, invitation } = await loadLiveInvitation(supabase, input.token);
  if (error || !invitation) return { error: error ?? "Invitation unavailable." };
  if (invitation.requires_payment) {
    return { error: "This session requires payment. Please use the payment button." };
  }

  const reserved = await reserveOption(supabase, invitation.id, input.optionId);
  if (reserved.error || !reserved.sessionAt) return { error: reserved.error ?? "That time is unavailable." };

  const result = await finalizeSession({
    source: "invitation_free",
    invitationId: invitation.id,
    optionId: input.optionId,
    sessionAtUtc: reserved.sessionAt,
    durationMinutes: invitation.duration_minutes,
    locationType: invitation.location_type,
    locationDetails: invitation.location_details,
    serviceType: invitation.service_type,
    serviceKey: invitation.service_key,
    sessionType: invitation.session_type,
    clientId: invitation.client_id,
    clientEmail: invitation.client_email,
    clientName: invitation.client_name ?? "",
    paymentStatus: "not_required",
    amountCents: null,
  });

  if ("error" in result) {
    // Release the reservation so the client can retry another time.
    await supabase
      .from("booking_invitation_options")
      .update({ status: "open" })
      .eq("id", input.optionId)
      .eq("status", "reserved");
    return { error: result.error };
  }

  redirect(`/book-session/${input.token}/confirmed`);
}

export async function createInvitationCheckoutSession(input: {
  token: string;
  optionId: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error, invitation } = await loadLiveInvitation(supabase, input.token);
  if (error || !invitation) return { error: error ?? "Invitation unavailable." };
  if (!invitation.requires_payment) {
    return { error: "This session doesn't require payment." };
  }
  if (!invitation.amount_cents && !invitation.stripe_price_id) {
    return { error: "This invitation is missing a price. Please contact Rachel." };
  }

  const reserved = await reserveOption(supabase, invitation.id, input.optionId);
  if (reserved.error || !reserved.sessionAt) return { error: reserved.error ?? "That time is unavailable." };

  const lineItem = invitation.stripe_price_id
    ? { price: invitation.stripe_price_id, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          product_data: { name: invitation.service_type },
          unit_amount: invitation.amount_cents as number,
        },
        quantity: 1,
      };

  // Expire the checkout when the option hold expires (the session-reminders cron
  // sweeps reserved holds older than 2h). Keeps the payable window from
  // outliving the reservation, so a late payment can't land on a reopened slot.
  const expiresAt = Math.floor(Date.now() / 1000) + 2 * 60 * 60;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: invitation.client_email,
      line_items: [lineItem],
      expires_at: expiresAt,
      metadata: {
        flow: "invitation",
        invitationId: invitation.id,
        optionId: input.optionId,
        clientName: invitation.client_name ?? "",
        clientEmail: invitation.client_email,
      },
      success_url: `${APP_URL}/book-session/${input.token}/confirmed`,
      cancel_url: `${APP_URL}/book-session/${input.token}?cancelled=1`,
    });
  } catch (err) {
    // Release the hold if Stripe failed.
    await supabase
      .from("booking_invitation_options")
      .update({ status: "open" })
      .eq("id", input.optionId)
      .eq("status", "reserved");
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }

  if (!session.url) {
    await supabase
      .from("booking_invitation_options")
      .update({ status: "open" })
      .eq("id", input.optionId)
      .eq("status", "reserved");
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(session.url);
}

/** Called when the client returns from an abandoned Stripe checkout. */
export async function releaseReservedOptions(token: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: inv } = await supabase
    .from("booking_invitations")
    .select("id, booking_id")
    .eq("token", token)
    .maybeSingle();
  if (!inv || inv.booking_id) return; // don't touch a completed invitation
  await supabase
    .from("booking_invitation_options")
    .update({ status: "open" })
    .eq("invitation_id", inv.id)
    .eq("status", "reserved");
}
