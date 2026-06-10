// Client LTV (full list) as CSV. Admin-only. Honors ?range=.

import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/reporting/range";
import { computeClientLtvReport } from "@/lib/reporting/client-ltv";
import { toCsv } from "@/lib/reporting/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const r = resolveRange(new URL(request.url).searchParams.get("range") ?? undefined);
  const report = await computeClientLtvReport(r);

  const csv = toCsv(
    ["client", "email", "revenue_usd", "payments", "completed_bookings"],
    report.rows.map((row) => [row.name, row.email, (row.revenueCents / 100).toFixed(2), row.payments, row.completedBookings])
  );
  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="client-ltv-${r.preset}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
