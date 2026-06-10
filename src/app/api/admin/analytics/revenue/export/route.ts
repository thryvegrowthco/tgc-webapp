// Revenue-by-service as CSV. Admin-only. Honors ?range= so the export matches
// what's on screen.

import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/reporting/range";
import { computeRevenueByServiceReport } from "@/lib/reporting/revenue-by-service";
import { toCsv } from "@/lib/reporting/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const r = resolveRange(new URL(request.url).searchParams.get("range") ?? undefined);
  const report = await computeRevenueByServiceReport(r);

  const csv = toCsv(
    ["service", "revenue_usd", "payments"],
    report.rows.map((row) => [row.service, (row.revenueCents / 100).toFixed(2), row.count])
  );
  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenue-by-service-${r.preset}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
