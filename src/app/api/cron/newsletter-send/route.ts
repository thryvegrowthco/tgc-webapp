// Hourly cron: send any scheduled newsletter issues whose scheduled_for has
// arrived. Triggered by cron-job.org — see docs/integrations.md for the
// schedule inventory.
//
// Failure model (see docs/workflows.md §7c):
//   - Nothing due, or a transient upstream error → 200 with a summary. An issue
//     that could not be read stays 'scheduled', so the next tick retries it;
//     alerting on those ticks is noise, not signal.
//   - An issue was genuinely due and failed to go out → 500, so cron-job.org
//     emails. That is the only condition a human needs to act on.
// Either way the run writes exactly one automation_log row, which is the
// durable record of what happened.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";
import { sendIssue } from "@/lib/email/newsletter-send";

export const runtime = "nodejs";
// Vercel (Hobby, Fluid compute) honours up to 300s; see "Timeouts" in
// docs/integrations.md. The send loop sleeps 1.1s per 100-recipient batch, so
// a large list needs the room: a run killed mid-send leaves the issue locked
// until the stale-lock reclaim below puts it back on the schedule.
export const maxDuration = 300;

// sendIssue locks an issue to status='sending' for the duration of the send.
// If the function is killed mid-send (deploy, timeout, OOM) nothing releases
// that lock, and the due query below only matches status='scheduled' — so the
// issue would silently never go out. Reclaim anything stuck longer than this
// and let the next tick retry it. The retry resumes rather than restarts:
// sendIssue leaves out anyone the killed run already reached, so nobody gets
// the issue twice.
const STALE_LOCK_MS = 15 * 60 * 1000;

interface DueIssue {
  id: string;
  title: string;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = getNowFromRequest(request);
  const nowIso = now.toISOString();
  const results: Array<{
    id: string;
    title: string;
    sent: number;
    failed: number;
    // Recipients a resumed send left out because the killed run reached them.
    skipped?: number;
    error?: string;
  }> = [];
  const errors: string[] = [];
  let reclaimed = 0;
  let checked = 0;
  // A due issue that did not go out — the only thing worth waking someone for.
  let lostSend = false;

  try {
    const supabase = createServiceClient();

    // 1. Reclaim stale locks left behind by a killed run.
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS).toISOString();
    const { data: staleRaw, error: staleError } = await supabase
      .from("newsletter_issues")
      .update({ status: "scheduled", updated_at: nowIso })
      .eq("status", "sending")
      .lt("updated_at", staleBefore)
      .select("id");

    if (staleError) {
      errors.push(`stale-lock reclaim: ${staleError.message}`);
    } else {
      reclaimed = (staleRaw ?? []).length;
    }

    // 2. Issues whose scheduled_for has arrived.
    const { data: dueRaw, error } = await supabase
      .from("newsletter_issues")
      .select("id, title, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true });

    if (error) {
      // Transient far more often than not, and nothing is lost: the issues stay
      // 'scheduled' and the next tick picks them up.
      throw new Error(`due-issue query failed: ${error.message}`);
    }

    const due = (dueRaw ?? []) as unknown as DueIssue[];
    checked = due.length;

    for (const issue of due) {
      try {
        const result = await sendIssue(issue.id);
        results.push({
          id: issue.id,
          title: issue.title,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
        });
        if (result.failed > 0) {
          lostSend = true;
          errors.push(
            `${issue.title}: ${result.failed} failed — ${result.errors.join("; ")}`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lostSend = true;
        results.push({
          id: issue.id,
          title: issue.title,
          sent: 0,
          failed: 0,
          error: message,
        });
        errors.push(`${issue.title}: ${message}`);
      }
    }
  } catch (err) {
    // createServiceClient(), the reclaim, or the due query. Previously this
    // escaped uncaught and produced a bare 500 with no trace of why.
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const summary = {
    checked,
    reclaimed,
    sent: results.reduce((n, r) => n + r.sent, 0),
    failed: results.reduce((n, r) => n + r.failed, 0),
    results,
    errors: errors.length,
  };

  // Observability: one automation_log row per run. Without this, a failed tick
  // left no trace anywhere once Vercel's runtime logs aged out.
  try {
    const supabase = createServiceClient();
    await supabase.from("automation_log").insert({
      event_key: "newsletter_send_run",
      // 'skipped' means the tick genuinely had nothing to do. Reclaiming a
      // stuck lock counts as work — it should not read as an idle tick.
      status:
        errors.length > 0
          ? "failed"
          : checked > 0 || reclaimed > 0
            ? "success"
            : "skipped",
      payload: summary,
      error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
    });
  } catch {
    // logging must not break the response
  }

  console.log("[newsletter-send cron]", JSON.stringify(summary));

  // Only a genuinely lost send is worth an alert. Everything else — an idle
  // tick, a transient query failure — is retried on the next tick and recorded
  // in automation_log.
  return Response.json(summary, { status: lostSend ? 500 : 200 });
}
