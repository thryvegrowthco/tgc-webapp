import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAdminBookingAlert } from "@/lib/email/resend";
import { sendTemplated } from "@/lib/email/render";
import { syncBookingToGHL } from "@/lib/gohighlevel/client";
import { createCalendarEvent } from "@/lib/google/calendar";
import { localCentralToUtcIso, formatCentralDate } from "@/lib/time/central";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
// For non-bookable services (resume, HR, etc.) intake is due 7 days after purchase.
const NON_SLOT_INTAKE_DAYS = 7;
// Job Alerts subscription: intake (watchlist setup) due in 3 days.
const SUBSCRIPTION_INTAKE_DAYS = 3;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription") {
      await handleSubscriptionCheckoutCompleted(session);
    } else {
      await handleCheckoutCompleted(session);
    }
  } else if (event.type === "customer.subscription.deleted") {
    await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
  } else if (event.type === "customer.subscription.updated") {
    await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
  }

  return new Response("OK", { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const slotId = meta.slotId || null;
  const serviceType = meta.serviceType ?? "Session";
  const serviceKey = meta.serviceKey ?? null;
  const clientName = meta.clientName ?? "";
  const clientEmail = session.customer_email ?? meta.clientEmail ?? "";
  const userId = meta.userId || null;
  const contractVersion = meta.contractVersion ?? null;
  const contractAcceptedAt = meta.contractAcceptedAt ?? null;

  const supabase = createServiceClient();

  // ─── Idempotency: bail if we've already created a booking for this session ───
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingBooking) {
    console.log("[Stripe Webhook] Booking already exists for session:", session.id);
    return;
  }

  // ─── Compute session_at + intake_due_at from slot ───
  let slotDate = "To be scheduled";
  let slotTime = "To be scheduled";
  let sessionAt: string | null = null;
  let intakeDueAt: string | null = null;

  if (slotId) {
    const { data: slot } = await supabase
      .from("availability_slots")
      .select("slot_date, start_time")
      .eq("id", slotId)
      .single();

    if (slot) {
      const d = new Date(`${slot.slot_date}T00:00:00`);
      slotDate = d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      slotTime = formatTime(slot.start_time);
      // Convert slot_date + start_time (Central wall-clock) to a true UTC
      // moment. The IANA tz database handles DST automatically.
      sessionAt = localCentralToUtcIso(slot.slot_date, slot.start_time);
      const intakeDue = new Date(sessionAt);
      intakeDue.setUTCHours(intakeDue.getUTCHours() - 24);
      intakeDueAt = intakeDue.toISOString();
    }
  }

  if (!sessionAt) {
    // Non-bookable service: intake is due `NON_SLOT_INTAKE_DAYS` days from purchase.
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + NON_SLOT_INTAKE_DAYS);
    intakeDueAt = due.toISOString();
  }

  // ─── Create the booking record with full workflow context ───
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: userId,
      slot_id: slotId,
      service_type: serviceType,
      service_key: serviceKey,
      status: "confirmed",
      workflow_status: "intake_needed",
      client_notes: meta.clientNotes || null,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      stripe_session_id: session.id,
      amount_cents: session.amount_total ?? 0,
      contract_accepted_at: contractAcceptedAt,
      contract_version: contractVersion,
      session_at: sessionAt,
      intake_due_at: intakeDueAt,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    console.error("[Stripe Webhook] Failed to create booking:", bookingError);
    return;
  }

  // Mark slot as booked so no one else can take it
  if (slotId) {
    await supabase
      .from("availability_slots")
      .update({ is_booked: true })
      .eq("id", slotId);
  }

  // Record the payment
  await supabase.from("payments").insert({
    client_id: userId,
    booking_id: booking.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    amount_cents: session.amount_total ?? 0,
    status: session.payment_status ?? "paid",
    service_type: serviceType,
  });

  // Attempt Google Calendar event creation. On failure, mark the booking so
  // the admin queue surfaces "manual meeting link needed".
  let meetLink: string | null = null;
  if (sessionAt) {
    try {
      const endIso = new Date(new Date(sessionAt).getTime() + 60 * 60 * 1000).toISOString();
      const eventResult = await createCalendarEvent({
        bookingId: booking.id,
        serviceType,
        clientName: clientName || clientEmail,
        clientEmail,
        clientNotes: meta.clientNotes || null,
        startIso: sessionAt,
        endIso,
        appUrl: APP_URL,
        clientId: userId,
      });
      if (eventResult) {
        meetLink = eventResult.meetLink;
        await supabase
          .from("bookings")
          .update({
            meet_link: eventResult.meetLink,
            calendar_event_id: eventResult.eventId,
            meet_link_pending: false,
          })
          .eq("id", booking.id);
        await supabase.from("automation_log").upsert(
          {
            event_key: "calendar_event_created",
            booking_id: booking.id,
            client_id: userId,
            status: "success",
            payload: { event_id: eventResult.eventId, meet_link: eventResult.meetLink },
          },
          { onConflict: "event_key,booking_id" }
        );
      } else {
        await supabase
          .from("bookings")
          .update({ meet_link_pending: true })
          .eq("id", booking.id);
        await supabase.from("automation_log").upsert(
          {
            event_key: "calendar_event_failed",
            booking_id: booking.id,
            client_id: userId,
            status: "failed",
            error_message: "Calendar API returned no event (likely not connected or auth expired).",
          },
          { onConflict: "event_key,booking_id" }
        );
      }
    } catch (err) {
      await supabase
        .from("bookings")
        .update({ meet_link_pending: true })
        .eq("id", booking.id);
      await supabase.from("automation_log").upsert(
        {
          event_key: "calendar_event_failed",
          booking_id: booking.id,
          client_id: userId,
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
        },
        { onConflict: "event_key,booking_id" }
      );
    }
  }

  const amountFormatted = formatCents(session.amount_total ?? 0);
  const intakeDueDate = intakeDueAt
    ? formatCentralDate(intakeDueAt, { weekday: "long", month: "long", day: "numeric" })
    : "Soon";
  const sessionWorkspaceUrl = `${APP_URL}/dashboard/sessions/${booking.id}`;

  const emailData = {
    clientName,
    clientEmail,
    serviceType,
    slotDate,
    slotTime,
    bookingId: booking.id,
  };

  // Send receipt, welcome, admin alert, and GHL sync in parallel.
  // Failures are isolated; the webhook always returns 200.
  await Promise.allSettled([
    sendTemplated("receipt", {
      to: clientEmail,
      bookingId: booking.id,
      clientId: userId ?? undefined,
      idempotent: true,
      data: {
        client_name: clientName || "there",
        service_type: serviceType,
        amount_formatted: amountFormatted,
        payment_date: new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        transaction_id: typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.id,
      },
    }),
    sendTemplated("welcome", {
      to: clientEmail,
      bookingId: booking.id,
      clientId: userId ?? undefined,
      idempotent: true,
      data: {
        client_name: clientName || "there",
        service_type: serviceType,
        intake_due_date: intakeDueDate,
        session_workspace_url: sessionWorkspaceUrl,
        session_date: slotDate,
        meet_link: meetLink ?? "",
      },
    }),
    sendAdminBookingAlert(emailData),
    syncBookingToGHL({ clientEmail, clientName, serviceType }),
  ]);
}

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const userId = meta.userId || null;
  const serviceType = meta.serviceType ?? "Job Alerts & Watchlists";
  const serviceKey = meta.serviceKey ?? "job_alerts_monthly";
  const clientName = meta.clientName ?? "";
  const clientEmail = session.customer_email ?? meta.clientEmail ?? "";
  const contractVersion = meta.contractVersion ?? null;
  const contractAcceptedAt = meta.contractAcceptedAt ?? null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId) {
    console.warn("[Stripe Webhook] Subscription checkout missing userId in metadata");
    return;
  }

  const supabase = createServiceClient();

  // ─── Idempotency for the booking row ───
  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  // ─── Watchlist profile (existing behavior preserved) ───
  const { data: existing } = await supabase
    .from("watchlist_profiles")
    .select("id")
    .eq("client_id", userId)
    .maybeSingle();

  const profilePayload = {
    client_id: userId,
    subscription_status: "active",
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase
      .from("watchlist_profiles")
      .update(profilePayload)
      .eq("client_id", userId);
  } else {
    await supabase.from("watchlist_profiles").insert({
      ...profilePayload,
      target_roles: [],
      industries: [],
      locations: [],
    });
  }

  // ─── Create a booking row so this subscription joins the status pipeline ───
  let bookingId = existingBooking?.id ?? null;
  if (!bookingId) {
    const intakeDue = new Date();
    intakeDue.setUTCDate(intakeDue.getUTCDate() + SUBSCRIPTION_INTAKE_DAYS);

    const { data: newBooking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        client_id: userId,
        slot_id: null,
        service_type: serviceType,
        service_key: serviceKey,
        status: "confirmed",
        workflow_status: "intake_needed",
        stripe_session_id: session.id,
        amount_cents: session.amount_total ?? 1500,
        contract_accepted_at: contractAcceptedAt,
        contract_version: contractVersion,
        intake_due_at: intakeDue.toISOString(),
      })
      .select("id")
      .single();

    if (bookingError || !newBooking) {
      console.error("[Stripe Webhook] Failed to create subscription booking:", bookingError);
    } else {
      bookingId = newBooking.id;
    }
  }

  // Record the payment
  await supabase.from("payments").insert({
    client_id: userId,
    booking_id: bookingId,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_subscription_id: subscriptionId,
    amount_cents: session.amount_total ?? 1500,
    status: session.payment_status ?? "paid",
    service_type: serviceType,
  });

  // Send receipt + welcome for the subscription too. The "session workspace"
  // for Job Alerts is the watchlist setup page.
  if (bookingId && clientEmail) {
    const amountFormatted = formatCents(session.amount_total ?? 1500);
    const intakeDueDate = formatCentralDate(
      new Date(Date.now() + SUBSCRIPTION_INTAKE_DAYS * 86400000),
      { weekday: "long", month: "long", day: "numeric" }
    );

    await Promise.allSettled([
      sendTemplated("receipt", {
        to: clientEmail,
        bookingId,
        clientId: userId,
        idempotent: true,
        data: {
          client_name: clientName || "there",
          service_type: serviceType,
          amount_formatted: `${amountFormatted}/month`,
          payment_date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          transaction_id: subscriptionId ?? session.id,
        },
      }),
      sendTemplated("welcome", {
        to: clientEmail,
        bookingId,
        clientId: userId,
        idempotent: true,
        data: {
          client_name: clientName || "there",
          service_type: serviceType,
          intake_due_date: intakeDueDate,
          session_workspace_url: `${APP_URL}/dashboard/watchlist/setup`,
          session_date: "",
          meet_link: "",
        },
      }),
    ]);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createServiceClient();

  // Cancel watchlist subscription
  const { error: watchlistError } = await supabase
    .from("watchlist_profiles")
    .update({ subscription_status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  if (watchlistError) {
    console.error("[Stripe Webhook] Failed to cancel watchlist_profile:", watchlistError);
  }

  // Cancel any active bookings tied to this subscription's checkout session(s)
  const { data: payments } = await supabase
    .from("payments")
    .select("booking_id")
    .eq("stripe_subscription_id", subscription.id);

  const bookingIds = (payments ?? [])
    .map((p) => p.booking_id)
    .filter((id): id is string => Boolean(id));

  if (bookingIds.length > 0) {
    await supabase
      .from("bookings")
      .update({ workflow_status: "cancelled", status: "cancelled" })
      .in("id", bookingIds);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeStatus = subscription.status;

  let localStatus: string;
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    localStatus = "active";
  } else if (
    stripeStatus === "past_due" ||
    stripeStatus === "paused" ||
    stripeStatus === "unpaid"
  ) {
    localStatus = "inactive";
  } else if (stripeStatus === "canceled") {
    localStatus = "cancelled";
  } else {
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("watchlist_profiles")
    .update({ subscription_status: localStatus, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[Stripe Webhook] Failed to update watchlist_profile status:", error);
  }
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}
