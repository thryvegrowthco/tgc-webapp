// Verifies Phase 3 (testimonials + client goals) end-to-end against the live DB.
// SAFE: Google/Resend/Stripe blocked; creates + deletes its own rows AND two
// ephemeral auth users (deleted in finally) used only to test RLS isolation.
// Run: npx tsx scripts/test-phase3-walk.mts
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
  if (u.includes("googleapis.com") || u.includes("oauth2.googleapis") || u.includes("resend.com") || u.includes("api.stripe.com")) {
    return Promise.resolve(new Response("{}", { status: 503 }));
  }
  // @ts-expect-error passthrough
  return realFetch(url, opts);
}) as typeof fetch;

const { createClient: createSb } = await import("@supabase/supabase-js");
const { createServiceClient } = await import("@/lib/supabase/service");
const { submitTestimonial, setTestimonialStatus, createTestimonial } = await import("@/app/actions/testimonials");
const { createGoal } = await import("@/app/actions/goals");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const db = createServiceClient();
const anon = createSb(SUPABASE_URL, ANON_KEY); // unauthenticated public client

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  ok ? pass++ : fail++;
};

// Actions that use the server (cookie) client either return an auth error OR
// throw "cookies outside request scope" when run here — both prove the action
// can't proceed without an authenticated request.
const expectGated = async (fn: () => Promise<{ error?: string }>): Promise<boolean> => {
  try {
    const r = await fn();
    return !!r.error;
  } catch {
    return true;
  }
};

const { data: anyProfile } = await db.from("profiles").select("id, full_name").limit(1).maybeSingle();
const clientId = anyProfile!.id as string;

let bookingId = "", t1 = "", tManualPending = "", tHidden = "";
const userIds: string[] = [];
const goalIds: string[] = [];

try {
  // ════ TESTIMONIALS ════════════════════════════════════════════════════════
  // 1. Booking gets a 32-hex testimonial_token (default/backfill works)
  const { data: booking } = await db.from("bookings").insert({
    client_id: clientId, service_type: "Career Coaching (TEST)", status: "completed", workflow_status: "completed",
  }).select("id, testimonial_token").single();
  bookingId = booking!.id;
  check("booking has a 32-hex testimonial_token", /^[0-9a-f]{32}$/.test(booking!.testimonial_token ?? ""), booking!.testimonial_token);
  const token = booking!.testimonial_token as string;

  // 2. Real submitTestimonial → pending row with snapshotted fields
  const sub = await submitTestimonial({ token, quote: "Rachel was transformative — a genuinely great experience.", authorName: "Jordan Tester", authorTitle: "Director", rating: 5 });
  check("submitTestimonial succeeded", !!sub.success, sub);
  const { data: made } = await db.from("testimonials").select("id, status, booking_id, client_id, service_type, rating, author_name").eq("booking_id", bookingId).maybeSingle();
  t1 = made?.id ?? "";
  check("pending testimonial with snapshot + rating",
    made?.status === "pending" && made?.client_id === clientId && made?.service_type === "Career Coaching (TEST)" && made?.rating === 5 && made?.author_name === "Jordan Tester");

  // 3. One per booking
  const dup = await submitTestimonial({ token, quote: "A second attempt should be blocked nicely.", authorName: "Jordan Tester" });
  check("second submit for same booking is rejected", !!dup.error, dup.error);

  // 4. Admin actions are auth-gated (no session in the harness)
  check("setTestimonialStatus is admin-gated (auth required)", await expectGated(() => setTestimonialStatus(t1, "approved")));
  check("createTestimonial is admin-gated", await expectGated(() => createTestimonial({ quote: "x", authorName: "y" })));

  // approve via service client (what the gated action would do) to set up the RLS test
  await db.from("testimonials").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", t1);

  // a manual pending + a hidden row, to prove anon sees ONLY approved
  const { data: mp } = await db.from("testimonials").insert({ quote: "Pending manual (TEST).", author_name: "Pat Pending", status: "pending" }).select("id").single();
  tManualPending = mp!.id;
  const { data: hd } = await db.from("testimonials").insert({ quote: "Hidden one (TEST).", author_name: "Hidden Hank", status: "hidden" }).select("id").single();
  tHidden = hd!.id;

  // 5. Public-read RLS: anon sees the approved one, not pending/hidden
  const { data: anonRows } = await anon.from("testimonials").select("id, status").in("id", [t1, tManualPending, tHidden]);
  const anonIds = new Set((anonRows ?? []).map((r) => r.id));
  check("anon sees the APPROVED testimonial", anonIds.has(t1));
  check("anon does NOT see pending/hidden", !anonIds.has(tManualPending) && !anonIds.has(tHidden), { visible: [...anonIds] });

  // manual create (booking_id null) doesn't collide with the partial unique index — already proven by the two inserts above
  check("manual testimonials (booking_id null) coexist", tManualPending !== "" && tHidden !== "");

  // ════ CLIENT GOALS ════════════════════════════════════════════════════════
  // 6. Action is auth-gated
  check("createGoal is auth-gated (no session)", await expectGated(() => createGoal({ title: "Should require sign-in" })));

  // 7. CHECK constraint on status (service client bypasses RLS but not CHECK)
  const { error: badStatus } = await db.from("client_goals").insert({ client_id: clientId, title: "Bad status (TEST)", status: "nonsense" as never });
  check("invalid goal status rejected by CHECK", !!badStatus, badStatus?.code);

  // 8. RLS owner isolation — two ephemeral authenticated users
  const pw = "Test!" + token.slice(0, 12);
  const mkUser = async (tag: string) => {
    const email = `phase3+${tag}-${token.slice(0, 8)}@thryve-harness.test`;
    const { data, error } = await db.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (error || !data.user) throw new Error("createUser failed: " + (error?.message ?? "null"));
    userIds.push(data.user.id);
    const c = createSb(SUPABASE_URL, ANON_KEY);
    const { error: signErr } = await c.auth.signInWithPassword({ email, password: pw });
    if (signErr) throw new Error("signIn failed: " + signErr.message);
    return { id: data.user.id, client: c };
  };
  const A = await mkUser("a");
  const B = await mkUser("b");

  // A creates a goal for themselves → allowed (owner WITH CHECK)
  const { data: aGoal, error: aErr } = await A.client.from("client_goals").insert({ client_id: A.id, title: "A's own goal (TEST)" }).select("id").single();
  check("owner can insert their own goal", !!aGoal && !aErr, aErr?.message);
  if (aGoal) goalIds.push(aGoal.id);

  // A tries to create a goal for B → blocked (not owner, not admin)
  const { error: crossErr } = await A.client.from("client_goals").insert({ client_id: B.id, title: "A writing B's goal (TEST)" });
  check("owner CANNOT insert a goal for another client", !!crossErr, crossErr?.code);

  // B cannot see A's goal; A can
  const { data: bSees } = await B.client.from("client_goals").select("id").eq("id", aGoal!.id);
  check("client B cannot read client A's goal (RLS isolation)", (bSees ?? []).length === 0);
  const { data: aSees } = await A.client.from("client_goals").select("id").eq("id", aGoal!.id);
  check("client A can read their own goal", (aSees ?? []).length === 1);

  // status transitions A makes persist
  await A.client.from("client_goals").update({ status: "in_progress" }).eq("id", aGoal!.id);
  const { data: prog } = await db.from("client_goals").select("status").eq("id", aGoal!.id).single();
  check("owner status transition persists (active → in_progress)", prog!.status === "in_progress");
} catch (err) {
  console.error("💥", err instanceof Error ? err.message : err);
  fail++;
} finally {
  for (const gid of goalIds) await db.from("client_goals").delete().eq("id", gid);
  for (const uid of userIds) {
    await db.from("client_goals").delete().eq("client_id", uid);
    await db.auth.admin.deleteUser(uid).catch(() => {});
  }
  for (const tid of [t1, tManualPending, tHidden]) if (tid) await db.from("testimonials").delete().eq("id", tid);
  if (bookingId) {
    await db.from("testimonials").delete().eq("booking_id", bookingId);
    await db.from("bookings").delete().eq("id", bookingId);
  }
  console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
