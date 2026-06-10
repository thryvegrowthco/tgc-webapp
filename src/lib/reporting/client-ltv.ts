// Client lifetime value: revenue (paid payments) summed per client, plus
// completed-bookings count + repeat rate. A client appears if they have a paid
// payment OR ≥1 completed booking (free/waived clients have completed bookings
// but no payment row). Revenue is "in selected range" (range-filtered), not a
// true all-time LTV — labeled as such on the page.

import { createServiceClient } from "@/lib/supabase/service";
import type { ReportRange } from "./range";

export interface ClientLtvRow {
  clientId: string;
  name: string;
  email: string;
  revenueCents: number;
  payments: number;
  completedBookings: number;
}

export interface ClientLtvReport {
  payingClients: number;
  totalRevenueCents: number;
  avgLtvCents: number;
  repeatRate: number; // clients with ≥2 completed / clients with ≥1 completed, 0..1
  rows: ClientLtvRow[]; // full list, sorted by revenue desc (page slices top-N)
}

export async function computeClientLtvReport(range: ReportRange): Promise<ClientLtvReport> {
  const supabase = createServiceClient();

  let payQ = supabase.from("payments").select("client_id, amount_cents, status, created_at");
  if (range.startIso) payQ = payQ.gte("created_at", range.startIso);
  if (range.endIso) payQ = payQ.lte("created_at", range.endIso);

  const [{ data: payRaw }, { data: bookRaw }] = await Promise.all([
    payQ,
    supabase.from("bookings").select("client_id, workflow_status, session_at, created_at"),
  ]);

  const payments = ((payRaw ?? []) as { client_id: string | null; amount_cents: number; status: string }[])
    .filter((p) => p.status === "paid" && p.client_id);

  const startMs = range.startIso ? new Date(range.startIso).getTime() : null;
  const completed = ((bookRaw ?? []) as {
    client_id: string | null;
    workflow_status: string;
    session_at: string | null;
    created_at: string;
  }[]).filter(
    (b) =>
      b.client_id &&
      b.workflow_status === "completed" &&
      (startMs === null || new Date(b.session_at ?? b.created_at).getTime() >= startMs)
  );

  const map = new Map<string, { revenueCents: number; payments: number; completedBookings: number }>();
  for (const p of payments) {
    const c = map.get(p.client_id!) ?? { revenueCents: 0, payments: 0, completedBookings: 0 };
    c.revenueCents += p.amount_cents ?? 0;
    c.payments++;
    map.set(p.client_id!, c);
  }
  for (const b of completed) {
    const c = map.get(b.client_id!) ?? { revenueCents: 0, payments: 0, completedBookings: 0 };
    c.completedBookings++;
    map.set(b.client_id!, c);
  }

  const clientIds = [...map.keys()];
  let profileMap: Record<string, { full_name: string | null; email: string }> = {};
  if (clientIds.length > 0) {
    const { data: profsRaw } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientIds);
    profileMap = Object.fromEntries(
      ((profsRaw ?? []) as { id: string; full_name: string | null; email: string }[]).map((p) => [p.id, p])
    );
  }

  const rows: ClientLtvRow[] = clientIds
    .map((id) => {
      const v = map.get(id)!;
      const p = profileMap[id];
      return {
        clientId: id,
        name: p?.full_name ?? "",
        email: p?.email ?? "",
        revenueCents: v.revenueCents,
        payments: v.payments,
        completedBookings: v.completedBookings,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents || b.completedBookings - a.completedBookings);

  const payingClients = rows.filter((r) => r.revenueCents > 0).length;
  const totalRevenueCents = rows.reduce((s, r) => s + r.revenueCents, 0);
  const withCompleted = rows.filter((r) => r.completedBookings >= 1).length;
  const repeat = rows.filter((r) => r.completedBookings >= 2).length;

  return {
    payingClients,
    totalRevenueCents,
    avgLtvCents: payingClients > 0 ? Math.round(totalRevenueCents / payingClients) : 0,
    repeatRate: withCompleted > 0 ? repeat / withCompleted : 0,
    rows,
  };
}
