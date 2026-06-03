"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";
import { SERVICES, BOOKABLE_SERVICES, type ServiceKey } from "@/lib/stripe/products";

export interface BookingFormData {
  serviceKey: ServiceKey;
  slotId: string | null;         // null for non-bookable services
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;
  contractAccepted: boolean;
  contractVersion: string;
}

export async function createBookingCheckoutSession(data: BookingFormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const product = SERVICES[data.serviceKey];
  if (!product) return { error: "Invalid service selected." };

  // Service agreement must be accepted before checkout — legal record stored on booking.
  if (!data.contractAccepted) {
    return { error: "Please agree to the Service Agreement to continue." };
  }
  if (!data.contractVersion) {
    return { error: "Contract version missing. Please refresh and try again." };
  }

  const requiresSlot = BOOKABLE_SERVICES.includes(data.serviceKey);
  if (requiresSlot && !data.slotId) {
    return { error: "Please select a date and time." };
  }

  // Verify slot is still available (double-check)
  if (data.slotId) {
    const { data: slot } = await supabase
      .from("availability_slots")
      .select("is_booked")
      .eq("id", data.slotId)
      .single();

    if (slot?.is_booked) {
      return { error: "That time slot was just taken. Please choose another." };
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const clientName = `${data.firstName} ${data.lastName}`;
  const contractAcceptedAt = new Date().toISOString();

  // Build Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: product.mode,
    payment_method_types: ["card"],
    customer_email: data.email,
    line_items: [
      {
        price: product.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      serviceKey: data.serviceKey,
      serviceType: product.serviceType,
      slotId: data.slotId ?? "",
      clientName,
      clientEmail: data.email,
      clientPhone: data.phone ?? "",
      clientNotes: data.notes ?? "",
      userId: user?.id ?? "",
      contractVersion: data.contractVersion,
      contractAcceptedAt,
    },
    success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/book?cancelled=1`,
  });

  if (!session.url) {
    return { error: "Failed to create checkout session. Please try again." };
  }

  redirect(session.url);
}

// Called from admin to update the status of an existing booking
export async function updateBookingStatus(
  bookingId: string,
  status: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const allowed = ["pending", "confirmed", "completed", "cancelled"] as const;
  type BookingStatus = typeof allowed[number];
  if (!(allowed as readonly string[]).includes(status)) return { error: "Invalid status" };

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("bookings")
    .update({ status: status as BookingStatus })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  return { success: true };
}

export interface BulkSlotPayload {
  dates: string[];                                              // YYYY-MM-DD
  timeBlocks: Array<{ startTime: string; endTime: string }>;    // HH:MM 24-hour
  serviceType: string | null;
}

const MAX_BULK_SLOTS = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Called from admin to create availability slots in bulk (dates × time blocks).
// Existing (slot_date, start_time) rows are skipped, not updated — surfaced via `skipped`.
export async function addBulkAvailabilitySlots(
  payload: BulkSlotPayload
): Promise<{ error?: string; created?: number; skipped?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { dates, timeBlocks, serviceType } = payload;

  if (!Array.isArray(dates) || dates.length === 0) {
    return { error: "Pick at least one date." };
  }
  if (!Array.isArray(timeBlocks) || timeBlocks.length === 0) {
    return { error: "Add at least one time block." };
  }
  for (const date of dates) {
    if (typeof date !== "string" || !DATE_RE.test(date)) {
      return { error: `Invalid date: ${date}` };
    }
  }
  for (const block of timeBlocks) {
    if (!TIME_RE.test(block.startTime) || !TIME_RE.test(block.endTime)) {
      return { error: "Time must be in HH:MM format." };
    }
    if (block.endTime <= block.startTime) {
      return { error: "End time must be after start time." };
    }
  }

  const rows = dates.flatMap((date) =>
    timeBlocks.map((tb) => ({
      slot_date: date,
      start_time: tb.startTime,
      end_time: tb.endTime,
      service_type: serviceType || null,
    }))
  );

  if (rows.length > MAX_BULK_SLOTS) {
    return { error: `Too many slots at once (${rows.length}). Limit is ${MAX_BULK_SLOTS}.` };
  }

  const { data, error } = await supabase
    .from("availability_slots")
    .upsert(rows, { onConflict: "slot_date,start_time", ignoreDuplicates: true })
    .select("id");

  if (error) return { error: error.message };

  const created = data?.length ?? 0;
  return { created, skipped: rows.length - created };
}

// Called from admin to delete a slot
export async function deleteAvailabilitySlot(slotId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("is_booked", false); // never delete booked slots

  if (error) return { error: error.message };
  return {};
}

// Called from admin to delete many slots at once. Booked rows are filtered out
// by the .eq("is_booked", false) guard — surfaced via the `skipped` count.
export async function deleteAvailabilitySlotsBulk(
  ids: string[]
): Promise<{ error?: string; deleted?: number; skipped?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  if (!Array.isArray(ids) || ids.length === 0) return { error: "Nothing selected." };
  if (ids.length > MAX_BULK_SLOTS) {
    return { error: `Too many at once (${ids.length}). Limit is ${MAX_BULK_SLOTS}.` };
  }

  const { data, error } = await supabase
    .from("availability_slots")
    .delete()
    .in("id", ids)
    .eq("is_booked", false)
    .select("id");

  if (error) return { error: error.message };
  const deleted = data?.length ?? 0;
  return { deleted, skipped: ids.length - deleted };
}
