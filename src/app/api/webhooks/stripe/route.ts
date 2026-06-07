import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAdminBookingAlert } from "@/lib/email/resend";
import { sendTemplated } from "@/lib/email/render";
import { syncBookingToGHL } from "@/lib/gohighlevel/client";
import { createCalendarEvent } from "@/lib/google/calendar";
import { localCentralToUtcIso, formatCentralDate } from "@/lib/time/central";
import { createAdminNotification, notifyAdmin } from "@/lib/notifications/admin";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "hello@thryvegrowth.co";
// For non-bookable services (resume, HR, etc.) intake is due 7 days after purchase.
const NON_SLOT_INTAKE_DAYS = 7;
// Job Alerts subscription: intake (watchlist setup) due in 3 days.
const SUBSCRIPTION_INTAKE_DAYS = 3;

interface PaymentMethodSummary {
  cardBrand: string;
  cardLast4: string;
  receiptUrl: string;
}

/**
 * Pull the user-facing payment-method info Stripe attaches to a session.
 * Receipts read better with "Visa ending in 4242" + a link to the official
 * Stripe-hosted receipt than with just a transaction ID. All fields default
 * to empty strings so the receipt template's `{{#if}}` blocks hide them when
 * Stripe doesn't surface them (test mode, ACH, etc.).
 */
async function fetchPaymentMethodSummary(
  paymentIntentId: string | null
): Promise<PaymentMethodSummary> {
  const empty: PaymentMethodSummary = { cardBrand: "", cardLast4: "", receiptUrl: "" };
  if (!paymentIntentId) return empty;

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    if (!charge) return empty;
    const card = charge.payment_method_details?.card;
    const brand = card?.brand ?? "";
    return {
      cardBrand: brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : "",
      cardLast4: card?.last4 ?? "",
      receiptUrl: charge.receipt_url ?? "",
    };
  } catch (err) {
    console.error("[Stripe Webhook] PaymentIntent retrieve failed:", err);
    return empty;
  }
}

/**
 * Look up the client's latest signed service agreement, if any. The welcome
 * email surfaces this so they can find their signed copy without hunting.
 * Empty string when no agreement is on file — the welcome template's
 * `{{#if signed_agreement_url}}` block hides the line in that case.
 */
async function fetchSignedAgreementUrl(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string | null
): Promise<string> {
  if (!clientId) return "";
  const { data } = await supabase
    .from("signed_service_agreements")
    .select("id")
    .eq("client_id", clientId)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return "";
  return `${APP_URL}/dashboard/legal/signed/${data.id}`;
}

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
  } else if (event.type === "invoice.payment_failed") {
    await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  const [paymentSummary, signedAgreementUrl] = await Promise.all([
    fetchPaymentMethodSummary(paymentIntentId),
    fetchSignedAgreementUrl(supabase, userId),
  ]);

  // In-app notification for the admin bell.
  await createAdminNotification({
    type: "new_booking",
    title: `New booking: ${clientName || clientEmail || "Unknown client"}`,
    body: `${serviceType}${sessionAt ? ` · ${slotDate} at ${slotTime}` : ""}`,
    link: userId ? `/admin/clients/${userId}#booking-${booking.id}` : `/admin/bookings`,
    bookingId: booking.id,
    clientId: userId,
  });

  // Auto-create a "Review intake when submitted" task for Rachel. The unique
  // partial index in migration 0013 makes this idempotent across webhook retries.
  await supabase
    .from("admin_tasks")
    .insert({
      title: "Review intake when submitted",
      description: `Service: ${serviceType}. Intake due ${intakeDueDate}.`,
      due_at: intakeDueAt,
      related_booking_id: booking.id,
      related_client_id: userId,
    })
    .then((res) => {
      if (res.error && !res.error.message.includes("duplicate")) {
        console.error("[Stripe Webhook] admin_tasks insert failed:", res.error);
      }
    });

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
        transaction_id: paymentIntentId ?? session.id,
        card_brand: paymentSummary.cardBrand,
        card_last4: paymentSummary.cardLast4,
        stripe_receipt_url: paymentSummary.receiptUrl,
        support_email: SUPPORT_EMAIL,
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
        signed_agreement_url: signedAgreementUrl,
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

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const [paymentSummary, signedAgreementUrl] = await Promise.all([
      fetchPaymentMethodSummary(paymentIntentId),
      fetchSignedAgreementUrl(supabase, userId),
    ]);

    // Email + in-app bell for the admin (subscriptions now reach Rachel by email,
    // matching one-time bookings).
    await notifyAdmin({
      type: "new_subscription",
      subject: `New Job Alerts subscription: ${clientName || clientEmail}`,
      title: `New subscription: ${clientName || clientEmail}`,
      fields: [
        { label: "Client", value: clientName || clientEmail || "Unknown" },
        ...(clientEmail ? [{ label: "Email", value: clientEmail }] : []),
        { label: "Service", value: serviceType },
      ],
      body: "A client just subscribed to Job Alerts. Review their watchlist once they complete setup.",
      link: `/admin/clients/${userId}#booking-${bookingId}`,
      ctaLabel: "Open client",
      bookingId,
      clientId: userId,
      replyTo: clientEmail || undefined,
    });

    // Auto-task: review the watchlist setup after the client submits intake.
    await supabase
      .from("admin_tasks")
      .insert({
        title: "Review intake when submitted",
        description: `${serviceType} subscription. Intake due ${intakeDueDate}.`,
        due_at: new Date(Date.now() + SUBSCRIPTION_INTAKE_DAYS * 86400000).toISOString(),
        related_booking_id: bookingId,
        related_client_id: userId,
      })
      .then((res) => {
        if (res.error && !res.error.message.includes("duplicate")) {
          console.error("[Stripe Webhook] admin_tasks insert failed:", res.error);
        }
      });

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
          card_brand: paymentSummary.cardBrand,
          card_last4: paymentSummary.cardLast4,
          stripe_receipt_url: paymentSummary.receiptUrl,
          support_email: SUPPORT_EMAIL,
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
          signed_agreement_url: signedAgreementUrl,
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

  await alertSubscriptionIssue(supabase, subscription.id, "Subscription cancelled");
}

// Email + bell to Rachel when a subscription hits trouble. Looks up the client
// from watchlist_profiles by stripe_subscription_id. Best-effort.
async function alertSubscriptionIssue(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptionId: string,
  reason: string
): Promise<void> {
  try {
    const { data: wl } = await supabase
      .from("watchlist_profiles")
      .select("client_id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    const clientId = (wl as { client_id: string | null } | null)?.client_id ?? null;

    let email: string | null = null;
    let name: string | null = null;
    if (clientId) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", clientId)
        .single();
      const profile = p as { full_name: string | null; email: string } | null;
      email = profile?.email ?? null;
      name = profile?.full_name ?? null;
    }

    await notifyAdmin({
      type: "subscription_issue",
      subject: `Job Alerts subscription issue: ${name || email || subscriptionId}`,
      title: reason,
      fields: [
        { label: "Client", value: name || email || "Unknown" },
        ...(email ? [{ label: "Email", value: email }] : []),
        { label: "Issue", value: reason },
      ],
      link: clientId ? `/admin/clients/${clientId}` : "/admin/watchlists",
      ctaLabel: "Open client",
      clientId,
      replyTo: email ?? undefined,
    });
  } catch (err) {
    console.error("[Stripe Webhook] subscription issue alert failed:", err);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof (invoice as { subscription?: unknown }).subscription === "string"
      ? ((invoice as { subscription?: string }).subscription as string)
      : null;
  if (!subscriptionId) return;
  await alertSubscriptionIssue(createServiceClient(), subscriptionId, "Payment failed");
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

  // Alert Rachel on any non-healthy transition (not routine active renewals).
  if (localStatus !== "active") {
    const reason =
      stripeStatus === "past_due"
        ? "Payment past due"
        : stripeStatus === "paused"
          ? "Subscription paused"
          : stripeStatus === "unpaid"
            ? "Payment unpaid"
            : "Subscription cancelled";
    await alertSubscriptionIssue(supabase, subscription.id, reason);
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
