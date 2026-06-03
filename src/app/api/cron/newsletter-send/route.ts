// Hourly cron: send any scheduled newsletter issues whose scheduled_for has
// arrived. See vercel.json for the schedule entry.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendIssue } from "@/lib/email/newsletter-send";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: dueRaw, error } = await supabase
    .from("newsletter_issues")
    .select("id, title, scheduled_for")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true });

  if (error) {
    console.error("[cron/newsletter-send] query failed:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const due = (dueRaw ?? []) as Array<{ id: string; title: string }>;
  if (due.length === 0) {
    return Response.json({ checked: 0, message: "No issues due" });
  }

  const results: Array<{ id: string; sent: number; failed: number; error?: string }> = [];
  for (const issue of due) {
    try {
      const result = await sendIssue(issue.id);
      results.push({ id: issue.id, sent: result.sent, failed: result.failed });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: issue.id, sent: 0, failed: 0, error: message });
      console.error(`[cron/newsletter-send] issue ${issue.id} failed:`, message);
    }
  }

  return Response.json({ checked: due.length, results });
}
