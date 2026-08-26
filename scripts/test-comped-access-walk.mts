// Verifies complimentary ("comped") Job Alerts access + the privilege-escalation fix from 0033.
// SAFE: Google/Resend/Stripe/RapidAPI blocked; creates + deletes its own auth user and rows.
// Run: npx tsx scripts/test-comped-access-walk.mts
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

// Block all external side effects (email, calendar, Stripe API, job feeds).
const realFetch = globalThis.fetch;
globalThis.fetch = ((url: unknown, opts?: unknown) => {
  const u = String(url);
  if (
    u.includes("googleapis.com") ||
    u.includes("oauth2.googleapis") ||
    u.includes("resend.com") ||
    u.includes("api.stripe.com") ||
    u.includes("rapidapi.com")
  ) {
    return Promise.resolve(new Response("{}", { status: 503 }));
  }
  // @ts-expect-error passthrough
  return realFetch(url, opts);
}) as typeof fetch;

const { createClient } = await import("@supabase/supabase-js");
const { createServiceClient } = await import("@/lib/supabase/service");
const { applyComplimentaryAccess, removeComplimentaryAccess } = await import("@/lib/watchlist/comp");
const { getWatchlistAccess } = await import("@/lib/watchlist/access");
const { computeJobAlertsReport } = await import("@/lib/reporting/job-alerts");

const db = createServiceClient();
let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  ok ? pass++ : fail++;
};

const NIL = "00000000-0000-0000-0000-000000000000";
const stamp = process.env.TEST_STAMP ?? String(process.hrtime.bigint());
const testEmail = `test+comp${stamp}@thryvegrowth.co`;
const testPassword = `Tc-${stamp}-Aa1!`;

let userId: string | null = null;
// An admin id for comped_by (FK → profiles). Falls back to null if none exists.
let adminId: string | null = null;

try {
  // ── 0. Preflight: is 0033 applied? ─────────────────────────────────────────
  const { error: colErr } = await db
    .from("watchlist_profiles")
    .select("access_source, comp_note, comped_by, comped_at, comped_until")
    .limit(1);
  if (colErr) {
    console.error(
      `\n💥 Migration 0033 is not applied yet — ${colErr.message}\n   Paste apply-0033.sql into the Supabase SQL Editor first.\n`
    );
    process.exit(1);
  }
  check("0033 columns present", true);

  // ── 1. Create a throwaway client; the trigger should make the profile ──────
  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "TEST Comp Client" },
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  userId = created.user.id;

  const { data: prof } = await db.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  const profRow = prof as { id: string; role: string } | null;
  check("handle_new_user() created the profile", profRow?.id === userId);
  check("new profile role is 'client'", profRow?.role === "client", profRow?.role);

  const { data: adminRow } = await db.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
  adminId = (adminRow as { id: string } | null)?.id ?? null;

  // ── 2. Privilege escalation is closed (the highest-value assertion) ────────
  // Sign in as the client with the ANON key — this is the exact surface a
  // browser session has, so it exercises RLS + the 0033 guard trigger.
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
  const asClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey);
  const { error: signInErr } = await asClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  check("test client can sign in", !signInErr, signInErr?.message);

  // 2a. Self-INSERT trying to grant itself access.
  const { error: selfInsertErr } = await asClient.from("watchlist_profiles").insert({
    client_id: userId,
    target_roles: ["Recruiter"],
    subscription_status: "active",
    access_source: "comped",
  });
  check("client self-insert is accepted (criteria allowed)", !selfInsertErr, selfInsertErr?.message);

  const { data: afterInsert } = await db
    .from("watchlist_profiles")
    .select("subscription_status, access_source, target_roles")
    .eq("client_id", userId)
    .maybeSingle();
  const ai = afterInsert as {
    subscription_status: string;
    access_source: string;
    target_roles: string[] | null;
  } | null;
  check("self-insert did NOT grant access", ai?.subscription_status === "inactive", ai?.subscription_status);
  check("self-insert did NOT set access_source=comped", ai?.access_source === "paid", ai?.access_source);
  check("self-insert DID save criteria", ai?.target_roles?.[0] === "Recruiter", ai?.target_roles);

  // 2b. Self-UPDATE trying to flip the status.
  const { error: selfUpdateErr } = await asClient
    .from("watchlist_profiles")
    .update({ subscription_status: "active", industries: ["HR"] })
    .eq("client_id", userId);
  check("client self-update is accepted (criteria allowed)", !selfUpdateErr, selfUpdateErr?.message);

  const { data: afterUpdate } = await db
    .from("watchlist_profiles")
    .select("subscription_status, industries")
    .eq("client_id", userId)
    .maybeSingle();
  const au = afterUpdate as { subscription_status: string; industries: string[] | null } | null;
  check("self-update did NOT grant access", au?.subscription_status === "inactive", au?.subscription_status);
  check("self-update DID save criteria", au?.industries?.[0] === "HR", au?.industries);

  await asClient.auth.signOut();

  // ── 3. Grant a comp to a client that already has a (self-made) row ─────────
  const grant1 = await applyComplimentaryAccess(userId, adminId, { note: "TEST friend comp" });
  check("grant on existing row succeeds", grant1.success === true, grant1);
  check("grant reports created=false", grant1.created === false);

  const { data: g1 } = await db
    .from("watchlist_profiles")
    .select("subscription_status, access_source, comp_note, comped_by, comped_at, comped_until")
    .eq("client_id", userId)
    .maybeSingle();
  const g1r = g1 as Record<string, unknown> | null;
  check("comped row is active", g1r?.subscription_status === "active", g1r?.subscription_status);
  check("access_source = comped", g1r?.access_source === "comped");
  check("comp_note recorded", g1r?.comp_note === "TEST friend comp");
  check("comped_by recorded", g1r?.comped_by === adminId, g1r?.comped_by);
  check("comped_at recorded", Boolean(g1r?.comped_at));
  check("comped_until is null (indefinite)", g1r?.comped_until === null);

  // ── 4. Re-grant is idempotent (client_id is UNIQUE) ────────────────────────
  const grant2 = await applyComplimentaryAccess(userId, adminId, { note: "TEST regrant" });
  check("re-grant succeeds", grant2.success === true, grant2);
  const { count: rowCount } = await db
    .from("watchlist_profiles")
    .select("*", { count: "exact", head: true })
    .eq("client_id", userId);
  check("re-grant did not duplicate the row", rowCount === 1, rowCount);

  // ── 5. Comps reach the job feed (the proof the whole design works) ─────────
  // Replicates the /api/cron/job-feed selection verbatim.
  const { data: feedBatch } = await db
    .from("watchlist_profiles")
    .select("client_id")
    .eq("subscription_status", "active")
    .order("last_feed_at", { ascending: true, nullsFirst: true })
    .limit(500);
  const feedIds = ((feedBatch ?? []) as { client_id: string | null }[]).map((r) => r.client_id);
  check("comped client is in the job-feed batch", feedIds.includes(userId), {
    batchSize: feedIds.length,
  });

  // ── 6. Gate behaviour is unchanged ─────────────────────────────────────────
  check("gate allows 'active'", getWatchlistAccess("active").allowed === true);
  check("gate blocks 'inactive'", getWatchlistAccess("inactive").allowed === false);
  check("gate blocks null", getWatchlistAccess(null).allowed === false);

  // ── 7. Reporting excludes comps from paid counters ─────────────────────────
  const report = await computeJobAlertsReport();
  const mine = report.clients.find((c) => c.clientId === userId);
  check("comped client appears in the report", Boolean(mine), mine?.accessSource);
  check("report labels it comped", mine?.accessSource === "comped", mine?.accessSource);
  check(
    "comped client is NOT counted in activeClients",
    report.activeClients === report.clients.filter(
      (c) => c.subscriptionStatus === "active" && c.accessSource === "paid"
    ).length,
    { activeClients: report.activeClients, compedClients: report.compedClients }
  );
  check("report counts it in compedClients", (report.compedClients ?? 0) >= 1, report.compedClients);

  // ── 8. Guard: refuse to comp a client who is billing ───────────────────────
  await db
    .from("watchlist_profiles")
    .update({ stripe_subscription_id: `sub_TEST_${stamp}` })
    .eq("client_id", userId);
  const blocked = await applyComplimentaryAccess(userId, adminId, { note: "TEST should fail" });
  check("grant refused when a Stripe sub is on file", Boolean(blocked.error), blocked.error);
  await db
    .from("watchlist_profiles")
    .update({ stripe_subscription_id: null })
    .eq("client_id", userId);

  // ── 9. Expiry sweep ────────────────────────────────────────────────────────
  const past = new Date(Date.now() - 86_400_000).toISOString();
  await applyComplimentaryAccess(userId, adminId, { note: "TEST expiring", until: past });
  const sweepNow = new Date().toISOString();
  const { data: swept } = await db
    .from("watchlist_profiles")
    .update({ subscription_status: "inactive", updated_at: sweepNow })
    .eq("access_source", "comped")
    .eq("subscription_status", "active")
    .lt("comped_until", sweepNow)
    .select("client_id");
  check(
    "lapsed comp is swept to inactive",
    ((swept ?? []) as { client_id: string | null }[]).some((r) => r.client_id === userId)
  );

  // An indefinite comp must survive the same sweep.
  await applyComplimentaryAccess(userId, adminId, { note: "TEST indefinite", until: null });
  const { data: swept2 } = await db
    .from("watchlist_profiles")
    .update({ subscription_status: "inactive", updated_at: new Date().toISOString() })
    .eq("access_source", "comped")
    .eq("subscription_status", "active")
    .lt("comped_until", new Date().toISOString())
    .select("client_id");
  check(
    "indefinite comp (comped_until NULL) is NOT swept",
    !((swept2 ?? []) as { client_id: string | null }[]).some((r) => r.client_id === userId)
  );

  // ── 10. Revoke keeps history ───────────────────────────────────────────────
  const revoked = await removeComplimentaryAccess(userId);
  check("revoke succeeds", revoked.success === true, revoked);
  const { data: rv } = await db
    .from("watchlist_profiles")
    .select("subscription_status, access_source, comp_note, comped_at")
    .eq("client_id", userId)
    .maybeSingle();
  const rvr = rv as Record<string, unknown> | null;
  check("revoked comp is inactive", rvr?.subscription_status === "inactive", rvr?.subscription_status);
  check("revoke keeps access_source=comped", rvr?.access_source === "comped");
  check("revoke keeps the note as history", Boolean(rvr?.comp_note), rvr?.comp_note);
  check("revoke keeps comped_at as history", Boolean(rvr?.comped_at));

  // ── 11. Conversion to paid (the Stripe webhook's profilePayload shape) ─────
  await db
    .from("watchlist_profiles")
    .update({
      subscription_status: "active",
      stripe_subscription_id: `sub_TESTPAID_${stamp}`,
      access_source: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", userId);
  const { data: conv } = await db
    .from("watchlist_profiles")
    .select("subscription_status, access_source, comp_note, comped_at")
    .eq("client_id", userId)
    .maybeSingle();
  const cv = conv as Record<string, unknown> | null;
  check("conversion sets access_source=paid", cv?.access_source === "paid");
  check("conversion keeps comp history", Boolean(cv?.comp_note) && Boolean(cv?.comped_at));

  // ── 12. Revoke refuses on a paid row ──────────────────────────────────────
  const revokePaid = await removeComplimentaryAccess(userId);
  check("revoke refused on a paid row", Boolean(revokePaid.error), revokePaid.error);
} catch (err) {
  console.error("💥", err);
  fail++;
} finally {
  // FK teardown order matters: neither profiles.id → auth.users nor
  // watchlist_profiles.client_id → profiles has ON DELETE CASCADE, so
  // deleteUser() fails with a foreign-key violation unless we go child-first.
  if (userId) {
    await db.from("watchlist_profiles").delete().eq("client_id", userId);
    await db.from("profiles").delete().eq("id", userId);
    const { error: delErr } = await db.auth.admin.deleteUser(userId);
    check("cleanup: auth user removed", !delErr, delErr?.message);

    const { count: leftover } = await db
      .from("watchlist_profiles")
      .select("*", { count: "exact", head: true })
      .in("client_id", [userId ?? NIL]);
    check("cleanup: test rows removed", leftover === 0, leftover);
  }
}

console.log(
  `\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`
);
process.exit(fail === 0 ? 0 : 1);
