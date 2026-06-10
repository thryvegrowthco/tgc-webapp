// Revenue grouped by service type. Sums paid payments (each payments row is one
// payment regardless of booking/proposal/subscription provenance — no double
// count). Range-filtered by created_at. Returns plain arrays (RSC-serializable).

import { createServiceClient } from "@/lib/supabase/service";
import type { ReportRange } from "./range";

export interface RevenueByServiceRow {
  service: string;
  revenueCents: number;
  count: number;
}

export interface RevenueByServiceReport {
  totalCents: number;
  paymentCount: number;
  rows: RevenueByServiceRow[];
}

export async function computeRevenueByServiceReport(range: ReportRange): Promise<RevenueByServiceReport> {
  const supabase = createServiceClient();
  let q = supabase.from("payments").select("amount_cents, status, service_type, created_at");
  if (range.startIso) q = q.gte("created_at", range.startIso);
  if (range.endIso) q = q.lte("created_at", range.endIso);
  const { data } = await q;

  const rows = (data ?? []) as { amount_cents: number; status: string; service_type: string | null }[];
  const paid = rows.filter((r) => r.status === "paid");

  const byService = new Map<string, { revenueCents: number; count: number }>();
  for (const p of paid) {
    const key = p.service_type?.trim() || "Unknown";
    const cur = byService.get(key) ?? { revenueCents: 0, count: 0 };
    cur.revenueCents += p.amount_cents ?? 0;
    cur.count++;
    byService.set(key, cur);
  }

  const out: RevenueByServiceRow[] = [...byService.entries()]
    .map(([service, v]) => ({ service, revenueCents: v.revenueCents, count: v.count }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return {
    totalCents: out.reduce((s, r) => s + r.revenueCents, 0),
    paymentCount: paid.length,
    rows: out,
  };
}
