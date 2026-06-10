// Phase 5 — READ-ONLY validation of the analytics reporting functions against
// the live DB. NO writes, NO cleanup (analytics only reads).
// Run: npx tsx scripts/test-phase5-analytics.mts
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

const { createServiceClient } = await import("@/lib/supabase/service");
const { resolveRange } = await import("@/lib/reporting/range");
const { computeRevenueByServiceReport } = await import("@/lib/reporting/revenue-by-service");
const { computeNoShowReport } = await import("@/lib/reporting/no-show");
const { computeFunnelReport } = await import("@/lib/reporting/funnel");
const { computeClientLtvReport } = await import("@/lib/reporting/client-ltv");
const { computePackageUtilizationReport } = await import("@/lib/reporting/package-utilization");

let pass = 0,
  fail = 0;
const check = (label: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "✅" : "❌"} ${label}${extra !== undefined ? `  — ${JSON.stringify(extra)}` : ""}`);
  if (ok) pass++;
  else fail++;
};
const rate = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
const nonNegInt = (n: number) => Number.isInteger(n) && n >= 0;

const all = resolveRange("all");
const recent = resolveRange("last_90");

try {
  // ── Revenue by service ──────────────────────────────────────────────────────
  const revAll = await computeRevenueByServiceReport(all);
  const revRecent = await computeRevenueByServiceReport(recent);
  check("revenue: shape + non-neg ints", Array.isArray(revAll.rows) && nonNegInt(revAll.totalCents) && nonNegInt(revAll.paymentCount));
  check("revenue: rows sum to total", revAll.rows.reduce((s, r) => s + r.revenueCents, 0) === revAll.totalCents);
  check("revenue: last_90 ≤ all (range monotonic)", revRecent.totalCents <= revAll.totalCents, { recent: revRecent.totalCents, all: revAll.totalCents });

  // Reconciliation: revenue-by-service `all` total === direct paid payments sum.
  const db = createServiceClient();
  const { data: payRaw } = await db.from("payments").select("amount_cents, status");
  const directPaid = ((payRaw ?? []) as { amount_cents: number; status: string }[])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  check("revenue: reconciles with direct paid-payments sum", revAll.totalCents === directPaid, { report: revAll.totalCents, direct: directPaid });

  // ── No-show ─────────────────────────────────────────────────────────────────
  const ns = await computeNoShowReport(all);
  check("no-show: rate in [0,1] + non-neg counts", rate(ns.rate) && nonNegInt(ns.noShow) && nonNegInt(ns.completed));
  check("no-show: per-service rates in [0,1]", ns.rows.every((r) => rate(r.rate)));
  check("no-show: per-service counts sum to totals",
    ns.rows.reduce((s, r) => s + r.noShow, 0) === ns.noShow && ns.rows.reduce((s, r) => s + r.completed, 0) === ns.completed);

  // ── Funnel ──────────────────────────────────────────────────────────────────
  const fn = await computeFunnelReport(all);
  const stageOk = fn.stages.every((s) => nonNegInt(s.count) && s.count <= fn.leadsCreated);
  check("funnel: each stage 0 ≤ count ≤ leadsCreated (NOT asserting monotonic)", stageOk, fn.stages.map((s) => s.count));
  check("funnel: paid ⊆ accepted ⊆ sent (proposal sub-stages)",
    fn.proposalPaid <= fn.proposalAccepted && fn.proposalAccepted <= fn.proposalSent, { sent: fn.proposalSent, acc: fn.proposalAccepted, paid: fn.proposalPaid });

  // ── Client LTV ──────────────────────────────────────────────────────────────
  const ltv = await computeClientLtvReport(all);
  check("ltv: shape + rate in [0,1] + non-neg", Array.isArray(ltv.rows) && rate(ltv.repeatRate) && nonNegInt(ltv.totalRevenueCents) && nonNegInt(ltv.payingClients));
  check("ltv: rows revenue desc-sorted", ltv.rows.every((r, i) => i === 0 || ltv.rows[i - 1].revenueCents >= r.revenueCents));
  check("ltv: paid rows sum to total revenue", ltv.rows.reduce((s, r) => s + r.revenueCents, 0) === ltv.totalRevenueCents);

  // ── Package utilization ─────────────────────────────────────────────────────
  const pkg = await computePackageUtilizationReport(all);
  check("packages: utilization in [0,1] + used ≤ total", rate(pkg.utilization) && pkg.usedSessions <= pkg.totalSessions);
  check("packages: per-service utilization in [0,1]", pkg.rows.every((r) => rate(r.utilization) && r.usedSessions <= r.totalSessions));
  check("packages: lost credits non-neg", nonNegInt(pkg.lostCredits) && nonNegInt(pkg.lostCreditPackages));

  console.log(`\n  (context: $${(revAll.totalCents / 100).toFixed(2)} all-time revenue across ${revAll.rows.length} services; ${fn.leadsCreated} leads; ${ltv.rows.length} clients with activity; ${pkg.totalSessions} package sessions)`);
} catch (err) {
  console.error("💥", err instanceof Error ? err.stack ?? err.message : err);
  fail++;
}

console.log(`\n${fail === 0 ? "🎉 ALL PASS" : "⚠️  SOME FAILED"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
