// Expire closed/stale job matches. For every active watchlist client, flips
// pre-application matches (new / saved / interested) to `expired` when the
// posting's deadline (`closes_at`) has passed — or, when no deadline is known,
// when the posting is older than EXPIRE_AFTER_DAYS (default 45). Expired matches
// leave the active list and show under the Inactive tab (admin + client).
//
// Only pre-application statuses expire: once someone has applied/interviewing/
// etc., the posting closing is expected and the match belongs in their tracker.
// Idempotent — re-running only touches matches that are still expirable.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized, getNowFromRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXPIRABLE_STATUSES = new Set(["new", "saved", "interested"]);
const EXPIRE_AFTER_DAYS = Number(process.env.EXPIRE_AFTER_DAYS ?? 45);

type JobDates = { closes_at: string | null; date_posted: string | null };

function isClosed(job: JobDates, now: Date, ageCutoff: Date): boolean {
  if (job.closes_at) {
    const closes = new Date(job.closes_at);
    return !Number.isNaN(closes.getTime()) && closes < now;
  }
  if (job.date_posted) {
    const posted = new Date(`${job.date_posted}T00:00:00Z`);
    return !Number.isNaN(posted.getTime()) && posted < ageCutoff;
  }
  return false; // no deadline and no posted date → can't tell, leave active
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const now = getNowFromRequest(request);
  const supabase = createServiceClient();

  const { data: wl } = await supabase
    .from("watchlist_profiles")
    .select("client_id")
    .eq("subscription_status", "active");
  const clientIds = ((wl ?? []) as { client_id: string | null }[])
    .map((r) => r.client_id)
    .filter((x): x is string => !!x);

  let candidates = 0;
  let expired = 0;

  if (clientIds.length > 0) {
    // Fetch matches for active clients; filter to expirable statuses in TS to
    // avoid .eq/.in on the union-literal `status` column (CLAUDE.md rule).
    const { data: matchesRaw } = await supabase
      .from("client_job_matches")
      .select("id, client_id, job_id, status")
      .in("client_id", clientIds);
    const cand = ((matchesRaw ?? []) as { id: string; job_id: string | null; status: string }[])
      .filter((m): m is { id: string; job_id: string; status: string } =>
        !!m.job_id && EXPIRABLE_STATUSES.has(m.status)
      );
    candidates = cand.length;

    if (cand.length > 0) {
      const jobIds = [...new Set(cand.map((m) => m.job_id))];
      const jobById = new Map<string, JobDates>();
      for (let i = 0; i < jobIds.length; i += 200) {
        const { data } = await supabase
          .from("job_listings")
          .select("id, closes_at, date_posted")
          .in("id", jobIds.slice(i, i + 200));
        for (const j of (data ?? []) as ({ id: string } & JobDates)[]) {
          jobById.set(j.id, { closes_at: j.closes_at, date_posted: j.date_posted });
        }
      }

      const ageCutoff = new Date(now.getTime() - EXPIRE_AFTER_DAYS * 86_400_000);
      const toExpire: string[] = [];
      for (const m of cand) {
        const job = jobById.get(m.job_id);
        if (job && isClosed(job, now, ageCutoff)) toExpire.push(m.id);
      }

      for (let i = 0; i < toExpire.length; i += 200) {
        const chunk = toExpire.slice(i, i + 200);
        const { error } = await supabase
          .from("client_job_matches")
          .update({ status: "expired" })
          .in("id", chunk);
        if (!error) expired += chunk.length;
      }
    }
  }

  const summary = {
    clients: clientIds.length,
    candidates,
    expired,
    expireAfterDays: EXPIRE_AFTER_DAYS,
  };

  try {
    await supabase.from("automation_log").insert({
      event_key: "expire_matches_run",
      status: "success",
      payload: summary,
      error_message: null,
    });
  } catch {
    // logging must never break the response
  }

  console.log("[expire-matches cron]", JSON.stringify(summary));
  return Response.json(summary);
}
