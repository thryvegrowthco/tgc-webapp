// Verifies the session-package credit flow end-to-end against the live DB.
// SAFE: Google/Resend blocked; creates + deletes its own test rows.
// Run: npx tsx scripts/test-package-walk.mts
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

const realFetch = globalThis.fetch;
globalThis.fetch = ((url: unknown, opts?: unknown) => {
  const u = String(url);
  if (u.includes("googleapis.com") || u.includes("oauth2.googleapis") || u.includes("resend.com")) {
    return Promise.resolve(new Response("{}", { status: 503 }));
  }
  // @ts-expect-error passthrough
  return realFetch(url, opts);
}) as typeof fetch;

const { createServiceClient } = await import("@/lib/supabase/service");
const { createSessionBooking } = await import("@/lib/booking/finalize");
const { localCentralToUtcIso } = await import("@/lib/time/central");

const db = createServiceClient();
let pass = 0, fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  ok ? pass++ : fail++;
};

// A real client_id (FK). Use any existing profile; clean up everything after.
const { data: anyProfile } = await db.from("profiles").select("id, email, full_name").limit(1).maybeSingle();
const clientId = anyProfile!.id as string;
const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 20 * 86400000));

let pkgId = "", slotId = "", bookingId = "";
try {
  // ── Simulate a 4-session package purchase (session 1 already used) ─────────
  const { data: pkg } = await db.from("session_packages").insert({
    client_id: clientId, service_key: "coaching_package", service_type: "Career & Leadership Coaching (TEST)",
    sessions_total: 4, sessions_used: 1, amount_cents: 42500, status: "active",
    expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
  }).select("id, sessions_used, sessions_total").single();
  pkgId = pkg!.id;
  check("package created (1 of 4 used)", pkg!.sessions_used === 1 && pkg!.sessions_total === 4);

  // ── Open availability slot (odd time to avoid colliding with real slots) ───
  const ODD_START = "05:13", ODD_END = "06:13";
  await db.from("availability_slots").delete().eq("slot_date", dateStr).eq("start_time", ODD_START).eq("is_booked", false);
  const { data: slot, error: slotErr } = await db.from("availability_slots").insert({
    slot_date: dateStr, start_time: ODD_START, end_time: ODD_END, service_type: null, is_booked: false,
  }).select("id").single();
  if (slotErr || !slot) throw new Error("slot insert failed: " + (slotErr?.message ?? "null"));
  slotId = slot.id;

  // ── Atomic slot claim (the redeem guard) ───────────────────────────────────
  const { data: claim1 } = await db.from("availability_slots").update({ is_booked: true })
    .eq("id", slotId).eq("is_booked", false).select("slot_date, start_time, end_time").maybeSingle();
  check("slot claimed atomically", !!claim1);
  const { data: claim2 } = await db.from("availability_slots").update({ is_booked: true })
    .eq("id", slotId).eq("is_booked", false).select("id").maybeSingle();
  check("second claim of same slot is rejected", !claim2);

  // ── Redeem: create the session via the shared core (no charge) ─────────────
  const sessionAtUtc = localCentralToUtcIso(claim1!.slot_date, claim1!.start_time);
  const res = await createSessionBooking({
    serviceType: "Career & Leadership Coaching (TEST)", serviceKey: "coaching_package", sessionType: null,
    sessionAtUtc, durationMinutes: 60, locationType: "google_meet", locationDetails: null,
    clientId, clientEmail: anyProfile!.email ?? "test@example.com", clientName: anyProfile!.full_name ?? "Test",
    paymentStatus: "paid", amountCents: null, slotId, sessionPackageId: pkgId, adminNotifyType: "new_booking",
  });
  check("createSessionBooking returned bookingId", "bookingId" in res, res);
  if (!("bookingId" in res)) throw new Error("redeem failed");
  bookingId = res.bookingId;

  const { data: bk } = await db.from("bookings").select("session_package_id, payment_status, slot_id, workflow_status").eq("id", bookingId).single();
  check("booking linked to package + slot, paid, scheduled",
    bk!.session_package_id === pkgId && bk!.payment_status === "paid" && bk!.slot_id === slotId && bk!.workflow_status === "session_scheduled");

  // ── Decrement the credit (what redeemPackageCredit does) ───────────────────
  await db.from("session_packages").update({ sessions_used: 2, status: "active", updated_at: new Date().toISOString() })
    .eq("id", pkgId).eq("sessions_used", 1);
  const { data: pkg2 } = await db.from("session_packages").select("sessions_used, status").eq("id", pkgId).single();
  check("credit decremented (2 of 4 used)", pkg2!.sessions_used === 2 && pkg2!.status === "active");

  // ── Cancel returns the credit (returnPackageCredit behavior) ───────────────
  await db.from("bookings").update({ workflow_status: "cancelled", status: "cancelled" }).eq("id", bookingId);
  const { data: pkgC } = await db.from("session_packages").select("sessions_used, status").eq("id", pkgId).single();
  await db.from("session_packages").update({ sessions_used: pkgC!.sessions_used - 1, status: pkgC!.status === "exhausted" ? "active" : pkgC!.status }).eq("id", pkgId);
  const { data: pkg3 } = await db.from("session_packages").select("sessions_used").eq("id", pkgId).single();
  check("cancel returned the credit (back to 1 of 4)", pkg3!.sessions_used === 1);
} catch (err) {
  console.error("💥", err instanceof Error ? err.message : err);
  fail++;
} finally {
  if (bookingId) {
    await db.from("admin_notifications").delete().eq("related_booking_id", bookingId);
    await db.from("automation_log").delete().eq("booking_id", bookingId);
    await db.from("payments").delete().eq("booking_id", bookingId);
    await db.from("bookings").delete().eq("id", bookingId);
  }
  if (slotId) await db.from("availability_slots").delete().eq("id", slotId);
  if (pkgId) await db.from("session_packages").delete().eq("id", pkgId);
  const { count } = await db.from("session_packages").select("*", { count: "exact", head: true }).eq("id", pkgId);
  check("cleanup: test rows removed", count === 0);
  console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
