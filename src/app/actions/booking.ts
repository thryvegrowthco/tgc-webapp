"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
}

export async function createBookingCheckoutSession(data: BookingFormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const product = SERVICES[data.serviceKey];
  if (!product) return { error: "Invalid service selected." };

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
    },
    success_url: `${appUrl}/book/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/book?cancelled=1`,
  });

  if (!session.url) {
    return { error: "Failed to create checkout session. Please try again." };
  }

  redirect(session.url);
}

// Called from admin to add a single availability slot
export async function addAvailabilitySlot(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const slotDate = formData.get("slotDate") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const serviceType = formData.get("serviceType") as string | null;

  if (!slotDate || !startTime || !endTime) {
    return { error: "Date, start time, and end time are required." };
  }

  const { error } = await supabase.from("availability_slots").insert({
    slot_date: slotDate,
    start_time: startTime,
    end_time: endTime,
    service_type: serviceType || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A slot already exists at that date and time." };
    }
    return { error: error.message };
  }

  return { success: true };
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
