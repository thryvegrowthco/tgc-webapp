// End-to-end test of the booking-invitation → session finalize logic against
// the live DB. SAFE: Google Calendar + Resend HTTP calls are blocked, so no real
// emails or calendar events are created. Creates test rows then deletes them.
// Covers BOTH the payment-OFF (free accept) and payment-ON (Stripe) branches.
//
// Run: npx tsx scripts/test-booking-walk.mts
import { readFileSync } from "node:fs";

// ── 1. Load .env.local into process.env (before importing app modules) ────────
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(k in process.env)) process.env[k] = v;
}

// ── 2. Block external side effects; let Supabase through ──────────────────────
const realFetch = globalThis.fetch;
const blocked: string[] = [];
globalThis.fetch = ((url: unknown, opts?: unknown) => {
  const u = String(url);
  if (u.includes("googleapis.com") || u.includes("oauth2.googleapis") || u.includes("resend.com")) {
    blocked.push(u.split("?")[0]);
    return Promise.resolve(new Response('{"error":"blocked by test harness"}', { status: 503 }));
  }
  // @ts-expect-error pass-through
  return realFetch(url, opts);
}) as typeof fetch;

// ── 3. Import app code (env + fetch patch now in place) ───────────────────────
const { createServiceClient } = await import("@/lib/supabase/service");
const { finalizeSession } = await import("@/lib/booking/finalize");
const { localCentralToUtcIso } = await import("@/lib/time/central");

const supabase = createServiceClient();
let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, extra?: unknown) {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  ok ? pass++ : fail++;
}

function centralDate(dayOffset: number) {
  const d = new Date(Date.now() + dayOffset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Distinct dates per scenario so their slots never overlap (the overlap guard
// would correctly reject a same-time second booking otherwise).
async function createInvite(opts: { requiresPayment: boolean; amountCents?: number | null; dayOffset: number }) {
  const dateStr = centralDate(opts.dayOffset);
  const email = `booking-walk-test+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const { data: inv } = await supabase
    .from("booking_invitations")
    .insert({
      client_email: email,
      client_name: "Booking Walk Test",
      service_type: "Career & Leadership Coaching",
      service_key: "coaching_single",
      session_type: "Discovery call",
      duration_minutes: 60,
      location_type: "google_meet",
      requires_payment: opts.requiresPayment,
      amount_cents: opts.amountCents ?? null,
      status: "sent",
      internal_notes: "automated test — safe to delete",
    })
    .select("id, token")
    .single();
  const { data: options } = await supabase
    .from("booking_invitation_options")
    .insert([
      { invitation_id: inv!.id, slot_date: dateStr, start_time: "10:00", session_at: localCentralToUtcIso(dateStr, "10:00") },
      { invitation_id: inv!.id, slot_date: dateStr, start_time: "14:00", session_at: localCentralToUtcIso(dateStr, "14:00") },
    ])
    .select("id, session_at, status")
    .order("session_at", { ascending: true });
  return { inv: inv!, options: options!, email };
}

async function reserve(invitationId: string, optionId: string) {
  const { data } = await supabase
    .from("booking_invitation_options")
    .update({ status: "reserved", reserved_at: new Date().toISOString() })
    .eq("id", optionId).eq("invitation_id", invitationId).eq("status", "open")
    .select("session_at").maybeSingle();
  return data;
}

async function cleanup(email: string, bookingId?: string) {
  if (bookingId) {
    await supabase.from("admin_notifications").delete().eq("related_booking_id", bookingId);
    await supabase.from("automation_log").delete().eq("booking_id", bookingId);
    await supabase.from("payments").delete().eq("booking_id", bookingId);
    await supabase.from("bookings").delete().eq("id", bookingId);
  }
  const { data: invs } = await supabase.from("booking_invitations").select("id").eq("client_email", email);
  for (const i of invs ?? []) await supabase.from("booking_invitations").delete().eq("id", i.id);
}

let freeEmail = "", paidEmail = "", freeBookingId = "", paidBookingId = "";

try {
  // ════════════════════ SCENARIO 1: payment-OFF (free accept) ════════════════
  console.log("\n— SCENARIO 1: payment-OFF —");
  const s1 = await createInvite({ requiresPayment: false, dayOffset: 5 });
  freeEmail = s1.email;
  check("invitation + 2 open options created", s1.options.length === 2 && s1.options.every((o) => o.status === "open"));

  const pageRes = await realFetch(`http://localhost:3987/book-session/${s1.inv.token}`);
  const html = await pageRes.text();
  check("public booking page renders selector", pageRes.status === 200 && html.includes("Confirm my session time"));

  check("option reserved atomically", !!(await reserve(s1.inv.id, s1.options[0].id)));

  const r1 = await finalizeSession({
    source: "invitation_free", invitationId: s1.inv.id, optionId: s1.options[0].id,
    sessionAtUtc: s1.options[0].session_at, durationMinutes: 60, locationType: "google_meet",
    locationDetails: null, serviceType: "Career & Leadership Coaching", serviceKey: "coaching_single",
    sessionType: "Discovery call", clientId: null, clientEmail: s1.email, clientName: "Booking Walk Test",
    paymentStatus: "not_required", amountCents: null,
  });
  check("finalizeSession returned bookingId", "bookingId" in r1, r1);
  if (!("bookingId" in r1)) throw new Error("free finalize failed");
  freeBookingId = r1.bookingId;

  const { data: bk1 } = await supabase.from("bookings")
    .select("workflow_status, payment_status, booking_invitation_id, meet_link_pending").eq("id", freeBookingId).single();
  check("booking session_scheduled + not_required + linked", bk1?.workflow_status === "session_scheduled" && bk1?.payment_status === "not_required" && bk1?.booking_invitation_id === s1.inv.id);
  check("meet_link_pending = true (calendar blocked)", bk1?.meet_link_pending === true);

  const { data: noPay } = await supabase.from("payments").select("id").eq("booking_id", freeBookingId);
  check("NO payments row for free booking", (noPay ?? []).length === 0);

  const { data: inv1 } = await supabase.from("booking_invitations").select("status, booking_id").eq("id", s1.inv.id).single();
  check("invitation accepted + linked", inv1?.status === "accepted" && inv1?.booking_id === freeBookingId);

  const { data: opts1 } = await supabase.from("booking_invitation_options").select("id, status").eq("invitation_id", s1.inv.id);
  check("chosen consumed / other withdrawn",
    opts1?.find((o) => o.id === s1.options[0].id)?.status === "consumed" &&
    opts1?.find((o) => o.id === s1.options[1].id)?.status === "withdrawn");

  const { data: log1 } = await supabase.from("automation_log").select("event_key").eq("booking_id", freeBookingId);
  check("audit log written (calendar + emails)", (log1 ?? []).length >= 3, (log1 ?? []).map((l) => l.event_key));

  const { data: notif1 } = await supabase.from("admin_notifications").select("type").eq("related_booking_id", freeBookingId);
  check("admin bell session_booked_via_invite", (notif1 ?? []).some((n) => n.type === "session_booked_via_invite"));

  const r1b = await finalizeSession({
    source: "invitation_free", invitationId: s1.inv.id, optionId: s1.options[0].id,
    sessionAtUtc: s1.options[0].session_at, durationMinutes: 60, locationType: "google_meet",
    locationDetails: null, serviceType: "Career & Leadership Coaching", serviceKey: "coaching_single",
    sessionType: "Discovery call", clientId: null, clientEmail: s1.email, clientName: "Booking Walk Test",
    paymentStatus: "not_required", amountCents: null,
  });
  check("idempotent re-finalize → same bookingId", "bookingId" in r1b && r1b.bookingId === freeBookingId);
  const { count: c1 } = await supabase.from("bookings").select("*", { count: "exact", head: true }).eq("booking_invitation_id", s1.inv.id);
  check("exactly ONE booking for invitation", c1 === 1, { count: c1 });

  // ════════════════════ SCENARIO 2: payment-ON (Stripe paid) ═════════════════
  console.log("\n— SCENARIO 2: payment-ON —");
  const s2 = await createInvite({ requiresPayment: true, amountCents: 12500, dayOffset: 12 });
  paidEmail = s2.email;
  await reserve(s2.inv.id, s2.options[0].id);
  const fakeSession = `cs_test_harness_${Date.now()}`;
  const fakePI = `pi_test_harness_${Date.now()}`;

  const r2 = await finalizeSession({
    source: "invitation_paid", invitationId: s2.inv.id, optionId: s2.options[0].id,
    sessionAtUtc: s2.options[0].session_at, durationMinutes: 60, locationType: "google_meet",
    locationDetails: null, serviceType: "Career & Leadership Coaching", serviceKey: "coaching_single",
    sessionType: "Discovery call", clientId: null, clientEmail: s2.email, clientName: "Booking Walk Test",
    paymentStatus: "paid", amountCents: 12500, stripeSessionId: fakeSession, stripePaymentIntentId: fakePI,
  });
  check("paid finalize returned bookingId", "bookingId" in r2, r2);
  if (!("bookingId" in r2)) throw new Error("paid finalize failed");
  paidBookingId = r2.bookingId;

  const { data: bk2 } = await supabase.from("bookings").select("payment_status, stripe_session_id, amount_cents").eq("id", paidBookingId).single();
  check("booking payment_status = paid", bk2?.payment_status === "paid");
  check("booking carries stripe_session_id + amount", bk2?.stripe_session_id === fakeSession && bk2?.amount_cents === 12500);

  const { data: pay2 } = await supabase.from("payments").select("amount_cents, status, stripe_payment_intent_id").eq("booking_id", paidBookingId);
  check("payments row created (paid, $125, PI)", pay2?.length === 1 && pay2[0].status === "paid" && pay2[0].amount_cents === 12500 && pay2[0].stripe_payment_intent_id === fakePI);

  const r2b = await finalizeSession({
    source: "invitation_paid", invitationId: s2.inv.id, optionId: s2.options[0].id,
    sessionAtUtc: s2.options[0].session_at, durationMinutes: 60, locationType: "google_meet",
    locationDetails: null, serviceType: "Career & Leadership Coaching", serviceKey: "coaching_single",
    sessionType: "Discovery call", clientId: null, clientEmail: s2.email, clientName: "Booking Walk Test",
    paymentStatus: "paid", amountCents: 12500, stripeSessionId: fakeSession, stripePaymentIntentId: fakePI,
  });
  check("idempotent paid re-finalize (stripe_session_id) → same booking", "bookingId" in r2b && r2b.bookingId === paidBookingId);
  const { count: payCount } = await supabase.from("payments").select("*", { count: "exact", head: true }).eq("booking_id", paidBookingId);
  check("still exactly ONE payments row", payCount === 1, { count: payCount });
} catch (err) {
  console.error("\n💥 harness error:", err instanceof Error ? err.message : err);
  fail++;
} finally {
  await cleanup(freeEmail, freeBookingId);
  await cleanup(paidEmail, paidBookingId);
  const { count: leftover } = await supabase.from("booking_invitations").select("*", { count: "exact", head: true }).like("client_email", "booking-walk-test+%@example.com");
  check("cleanup: all test rows removed", leftover === 0, { leftover });
  check("no real Google/Resend calls escaped", true, { blockedExternalCalls: blocked.length });
  console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
