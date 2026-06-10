// Verifies the Phase 2 proposal → accept → pay flow end-to-end against the live DB.
// SAFE: Google/Resend/Stripe blocked; creates + deletes its own test rows.
// Run: npx tsx scripts/test-proposal-walk.mts
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

// Block all external side effects (email, calendar, Stripe API).
const realFetch = globalThis.fetch;
globalThis.fetch = ((url: unknown, opts?: unknown) => {
  const u = String(url);
  if (
    u.includes("googleapis.com") ||
    u.includes("oauth2.googleapis") ||
    u.includes("resend.com") ||
    u.includes("api.stripe.com")
  ) {
    return Promise.resolve(new Response("{}", { status: 503 }));
  }
  // @ts-expect-error passthrough
  return realFetch(url, opts);
}) as typeof fetch;

const { createServiceClient } = await import("@/lib/supabase/service");
const { acceptProposal, declineProposal } = await import("@/app/actions/proposals");

const db = createServiceClient();
let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  ok ? pass++ : fail++;
};

// A real client_id (FK) so the payment link can carry one. Clean up everything after.
const { data: anyProfile } = await db.from("profiles").select("id, email, full_name").limit(1).maybeSingle();
const clientId = anyProfile!.id as string;

const SAMPLE_CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Scope: HR policy audit (TEST)." }] }],
};

// Track ids for cleanup.
const proposalIds: string[] = [];
const noteTitles: string[] = [];

async function makeProposal(fields: Record<string, unknown>): Promise<string> {
  const { data, error } = await db
    .from("proposals")
    .insert({
      client_id: clientId,
      client_email: anyProfile!.email ?? "test@example.com",
      client_name: anyProfile!.full_name ?? "Test Client",
      title: "TEST Proposal",
      content: SAMPLE_CONTENT,
      requires_signature: true,
      ...fields,
    })
    .select("id, token, status")
    .single();
  if (error || !data) throw new Error("proposal insert failed: " + (error?.message ?? "null"));
  proposalIds.push(data.id);
  return data.token as string;
}

try {
  // ── 1. Token + draft defaults ───────────────────────────────────────────────
  const draftToken = await makeProposal({ title: "TEST Draft Proposal", amount_cents: 25000 });
  const { data: draft } = await db.from("proposals").select("token, status, amount_cents").eq("token", draftToken).single();
  check("proposal created with token + draft status", !!draft!.token && draft!.status === "draft" && draft!.amount_cents === 25000);
  noteTitles.push("Proposal accepted — TEST Draft Proposal");

  // ── 2. Accept a $0 (no-charge) proposal via the REAL action (no Stripe) ──────
  const freeToken = await makeProposal({ title: "TEST Free Agreement", amount_cents: 0 });
  noteTitles.push("Proposal accepted — TEST Free Agreement");
  let redirected = false;
  try {
    await acceptProposal({ token: freeToken, signedName: "Jordan Tester" });
  } catch (e) {
    // redirect() throws NEXT_REDIRECT on success — that's the happy path here.
    redirected = String((e as { digest?: string })?.digest ?? e).includes("NEXT_REDIRECT");
  }
  check("acceptProposal ($0) redirected on success", redirected);
  const { data: accepted } = await db
    .from("proposals")
    .select("status, accepted_name, accepted_at, accepted_snapshot")
    .eq("token", freeToken)
    .single();
  check(
    "no-charge proposal is accepted + signature snapshot captured",
    accepted!.status === "accepted" &&
      accepted!.accepted_name === "Jordan Tester" &&
      accepted!.accepted_at != null &&
      accepted!.accepted_snapshot != null,
    { status: accepted!.status, name: accepted!.accepted_name }
  );

  // ── 3. Re-accept is idempotent (original signature/timestamp preserved) ──────
  const firstAcceptedAt = accepted!.accepted_at;
  try {
    await acceptProposal({ token: freeToken, signedName: "Someone Else" });
  } catch {
    /* redirect again */
  }
  const { data: reaccepted } = await db
    .from("proposals")
    .select("accepted_name, accepted_at")
    .eq("token", freeToken)
    .single();
  check(
    "re-accept preserves original signature (no overwrite)",
    reaccepted!.accepted_name === "Jordan Tester" && reaccepted!.accepted_at === firstAcceptedAt
  );

  // ── 4. Expired proposal is rejected (returns error, no redirect) ─────────────
  const expiredToken = await makeProposal({
    title: "TEST Expired Proposal",
    amount_cents: 10000,
    status: "sent",
    expires_at: new Date(Date.now() - 86400000).toISOString(),
  });
  const expiredRes = await acceptProposal({ token: expiredToken, signedName: "Too Late" });
  check("expired proposal acceptance is rejected", !!expiredRes?.error && /expired/i.test(expiredRes.error), expiredRes);

  // ── 5. Decline flow ──────────────────────────────────────────────────────────
  const declineToken = await makeProposal({ title: "TEST Decline Proposal", amount_cents: 50000, status: "sent" });
  noteTitles.push("Proposal declined — TEST Decline Proposal");
  const declineRes = await declineProposal({ token: declineToken });
  const { data: declined } = await db.from("proposals").select("status, declined_at").eq("token", declineToken).single();
  check("decline marks status=declined", !declineRes?.error && declined!.status === "declined" && declined!.declined_at != null);

  // ── 6. Paid transition + idempotency + unique stripe_session_id (webhook) ─────
  const paidToken = await makeProposal({ title: "TEST Paid Proposal", amount_cents: 25000, status: "accepted" });
  const { data: paidProp } = await db.from("proposals").select("id").eq("token", paidToken).single();
  const paidId = paidProp!.id as string;
  const STRIPE_SESSION = `cs_test_proposal_${paidId.slice(0, 8)}`;

  const { data: paidUpd } = await db
    .from("proposals")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: STRIPE_SESSION,
      stripe_payment_intent_id: "pi_test_123",
    })
    .eq("id", paidId)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  check("paid transition applied", !!paidUpd);

  // Idempotency guard: the same conditional update should now affect 0 rows.
  const { data: paidAgain } = await db
    .from("proposals")
    .update({ status: "paid" })
    .eq("id", paidId)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  check("second paid update is a no-op (idempotent)", !paidAgain);

  // The partial unique index blocks a second proposal reusing the session id.
  const { error: dupErr } = await db.from("proposals").insert({
    client_id: clientId,
    client_email: "dupe@example.com",
    title: "TEST Dupe Session",
    content: SAMPLE_CONTENT,
    amount_cents: 25000,
    stripe_session_id: STRIPE_SESSION,
  });
  check("duplicate stripe_session_id is rejected by unique index", !!dupErr, dupErr?.message?.slice(0, 60));

  // ── 7. payments.proposal_id link ─────────────────────────────────────────────
  const { data: pay } = await db
    .from("payments")
    .insert({
      client_id: clientId,
      proposal_id: paidId,
      stripe_payment_intent_id: `pi_test_${paidId.slice(0, 8)}`,
      amount_cents: 25000,
      status: "paid",
      service_type: "TEST Paid Proposal",
    })
    .select("id, proposal_id")
    .single();
  check("payment links to proposal", pay!.proposal_id === paidId);
  if (pay) await db.from("payments").delete().eq("id", pay.id);
} catch (err) {
  console.error("💥", err instanceof Error ? err.message : err);
  fail++;
} finally {
  // Remove any payments tied to the test proposals, the proposals, and the
  // admin_notifications notifyAdmin created for them.
  for (const pid of proposalIds) {
    await db.from("payments").delete().eq("proposal_id", pid);
  }
  if (proposalIds.length) await db.from("proposals").delete().in("id", proposalIds);
  for (const title of noteTitles) {
    await db.from("admin_notifications").delete().eq("title", title);
  }
  const { count } = await db
    .from("proposals")
    .select("*", { count: "exact", head: true })
    .in("id", proposalIds.length ? proposalIds : ["00000000-0000-0000-0000-000000000000"]);
  check("cleanup: test rows removed", count === 0);
  console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
