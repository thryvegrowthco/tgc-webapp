import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingConfirmation, sendAdminBookingAlert } from "@/lib/email/resend";
import { syncBookingToGHL } from "@/lib/gohighlevel/client";

export const runtime = "nodejs";

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
  }

  return new Response("OK", { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const slotId = meta.slotId || null;
  const serviceType = meta.serviceType ?? "Session";
  const clientName = meta.clientName ?? "";
  const clientEmail = session.customer_email ?? meta.clientEmail ?? "";
  const userId = meta.userId || null;

  const supabase = createServiceClient();

  // Fetch slot details so we can include date/time in the confirmation email
  let slotDate = "To be scheduled";
  let slotTime = "To be scheduled";

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
    }
  }

  // Create the booking record
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      client_id: userId,
      slot_id: slotId,
      service_type: serviceType,
      status: "confirmed",
      client_notes: meta.clientNotes || null,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      amount_cents: session.amount_total ?? 0,
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

  const emailData = {
    clientName,
    clientEmail,
    serviceType,
    slotDate,
    slotTime,
    bookingId: booking.id,
  };

  // Send emails + GHL sync in parallel; don't let failures block the 200 response
  await Promise.allSettled([
    sendBookingConfirmation(emailData),
    sendAdminBookingAlert(emailData),
    syncBookingToGHL({ clientEmail, clientName, serviceType }),
  ]);
}

async function handleSubscriptionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const userId = meta.userId || null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId) {
    console.warn("[Stripe Webhook] Subscription checkout missing userId in metadata");
    return;
  }

  const supabase = createServiceClient();

  // Create or activate the watchlist_profile for this client
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

  // Record the payment
  await supabase.from("payments").insert({
    client_id: userId,
    booking_id: null,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_subscription_id: subscriptionId,
    amount_cents: session.amount_total ?? 5000,
    status: session.payment_status ?? "paid",
    service_type: "Job Alerts & Watchlists",
  });
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}
