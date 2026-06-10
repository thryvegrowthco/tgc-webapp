"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSessionBooking } from "@/lib/booking/finalize";
import { localCentralToUtcIso } from "@/lib/time/central";

// Redeem one session credit from an active package by booking an open slot —
// no new payment (the package already covers it).
export async function redeemPackageCredit(input: {
  packageId: string;
  slotId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard/packages");

  const service = createServiceClient();

  // ─── Validate the package (own, active, has credits, not expired) ─────────
  const { data: pkg } = await service
    .from("session_packages")
    .select("id, client_id, service_key, service_type, sessions_total, sessions_used, status, expires_at")
    .eq("id", input.packageId)
    .maybeSingle();
  if (!pkg || pkg.client_id !== user.id) return { error: "Package not found." };
  if (pkg.status !== "active") return { error: "This package is no longer active." };
  if (pkg.sessions_used >= pkg.sessions_total) return { error: "You've used all sessions in this package." };
  if (pkg.expires_at && new Date(pkg.expires_at) < new Date()) {
    return { error: "This package has expired. Contact Rachel if you have remaining sessions." };
  }

  // ─── Atomically claim the slot (prevents two redemptions taking it) ──────
  const { data: claimed } = await service
    .from("availability_slots")
    .update({ is_booked: true })
    .eq("id", input.slotId)
    .eq("is_booked", false)
    .select("slot_date, start_time, end_time")
    .maybeSingle();
  if (!claimed) return { error: "That time was just taken. Please choose another." };

  const sessionAtUtc = localCentralToUtcIso(claimed.slot_date, claimed.start_time);
  const durationMinutes = slotMinutes(claimed.start_time, claimed.end_time);

  // ─── Client identity for the confirmation email ──────────────────────────
  const { data: profile } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const clientEmail = (profile as { email: string } | null)?.email ?? user.email ?? "";
  const clientName = (profile as { full_name: string | null } | null)?.full_name ?? "";

  // ─── Create the session (paid = covered by the package) ──────────────────
  const result = await createSessionBooking({
    serviceType: pkg.service_type,
    serviceKey: pkg.service_key,
    sessionType: null,
    sessionAtUtc,
    durationMinutes,
    locationType: "google_meet",
    locationDetails: null,
    clientId: user.id,
    clientEmail,
    clientName,
    paymentStatus: "paid", // covered by the package purchase
    amountCents: null,
    slotId: input.slotId,
    sessionPackageId: pkg.id,
    adminNotifyType: "new_booking",
  });

  if ("error" in result) {
    // Release the slot so the client can retry.
    await service.from("availability_slots").update({ is_booked: false }).eq("id", input.slotId);
    return { error: result.error };
  }

  // ─── Decrement the credit (optimistic guard against a concurrent redeem) ──
  const nextUsed = pkg.sessions_used + 1;
  await service
    .from("session_packages")
    .update({
      sessions_used: nextUsed,
      status: nextUsed >= pkg.sessions_total ? "exhausted" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", pkg.id)
    .eq("sessions_used", pkg.sessions_used);

  revalidatePath("/dashboard/packages");
  redirect(`/dashboard/sessions/${result.bookingId}`);
}

function slotMinutes(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const d = toMin(end) - toMin(start);
  return d > 0 ? d : 60;
}
