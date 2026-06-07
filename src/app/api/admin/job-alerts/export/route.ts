// Per-client Job Alerts report as CSV. Admin-only.

import { createClient } from "@/lib/supabase/server";
import { computeJobAlertsReport } from "@/lib/reporting/job-alerts";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const report = await computeJobAlertsReport();

  const header = [
    "name",
    "email",
    "subscription_status",
    "review_status",
    "total_matches",
    "applications",
    "interviews",
    "offers",
    "accepted",
    "target_roles",
  ];
  const lines = [header.join(",")];
  for (const c of report.clients) {
    lines.push(
      [
        csvCell(c.name),
        csvCell(c.email),
        csvCell(c.subscriptionStatus),
        csvCell(c.reviewStatus),
        csvCell(String(c.totalMatches)),
        csvCell(String(c.applications)),
        csvCell(String(c.interviews)),
        csvCell(String(c.offers)),
        csvCell(String(c.accepted)),
        csvCell(c.topRoles.join("; ")),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-alerts-report-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// RFC 4180 cell quoting.
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
