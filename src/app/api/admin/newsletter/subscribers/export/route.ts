// Subscriber CSV export. Honors the same `interest` / `status` / `q` filters
// as /admin/newsletter/subscribers so Rachel can export a filtered view.

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type SubRow = {
  id: string;
  email: string;
  first_name: string | null;
  source: string | null;
  interests: string[];
  subscribed_at: string;
  unsubscribed_at: string | null;
  last_engaged_at: string | null;
  last_sent_at: string | null;
};

export async function GET(request: NextRequest) {
  // Admin auth — same pattern as preview/test-send routes
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const p = profile as { role: string } | null;
  if (p?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const interest = searchParams.get("interest");
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  // Build the query with the same filter logic as the subscribers page
  const service = createServiceClient();
  let query = service
    .from("newsletter_subscribers")
    .select("id, email, first_name, source, interests, subscribed_at, unsubscribed_at, last_engaged_at, last_sent_at")
    .order("subscribed_at", { ascending: false });

  if (status === "unsubscribed") {
    query = query.not("unsubscribed_at", "is", null);
  } else {
    query = query.is("unsubscribed_at", null);
  }
  if (interest) query = query.contains("interests", [interest]);
  if (q) query = query.ilike("email", `%${q}%`);

  const { data: rowsRaw, error } = await query;
  if (error) {
    return new Response(`Query failed: ${error.message}`, { status: 500 });
  }
  const rows = (rowsRaw ?? []) as SubRow[];

  // Build CSV
  const header = [
    "id",
    "email",
    "first_name",
    "source",
    "interests",
    "subscribed_at",
    "unsubscribed_at",
    "last_engaged_at",
    "last_sent_at",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      csvCell(r.id),
      csvCell(r.email),
      csvCell(r.first_name ?? ""),
      csvCell(r.source ?? ""),
      csvCell((r.interests ?? []).join(";")),
      csvCell(r.subscribed_at),
      csvCell(r.unsubscribed_at ?? ""),
      csvCell(r.last_engaged_at ?? ""),
      csvCell(r.last_sent_at ?? ""),
    ].join(","));
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-subscribers-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// Quote any cell containing a comma, quote, CR, or LF. Doubles embedded quotes
// per RFC 4180.
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
