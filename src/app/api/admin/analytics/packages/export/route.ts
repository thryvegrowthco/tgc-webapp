// Package utilization (by service) as CSV. Admin-only. Honors ?range=.

import { createClient } from "@/lib/supabase/server";
import { resolveRange } from "@/lib/reporting/range";
import { computePackageUtilizationReport } from "@/lib/reporting/package-utilization";
import { toCsv } from "@/lib/reporting/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const r = resolveRange(new URL(request.url).searchParams.get("range") ?? undefined);
  const report = await computePackageUtilizationReport(r);

  const csv = toCsv(
    ["service", "total_sessions", "used_sessions", "utilization_pct", "packages"],
    report.rows.map((row) => [
      row.service,
      row.totalSessions,
      row.usedSessions,
      Math.round(row.utilization * 100),
      row.packages,
    ])
  );
  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="package-utilization-${r.preset}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
