// Automated job feed — pulls jobs from every enabled source for every active
// watchlist client, scores + dedups + assigns matches, and notifies clients of
// new ones. Called by cron-job.org / Vercel Cron (see docs/integrations.md).
//
// Distinct from /api/cron/job-alerts (which only emails a weekly digest of
// already-assigned matches). This is the engine that *creates* matches.

import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized } from "@/lib/cron/auth";
import { getEnabledSources } from "@/lib/job-api/sources";
import { ingestForClient, SCORING_PROFILE_COLUMNS } from "@/lib/job-api/ingest";
import type { ProfileForScoring } from "@/lib/matching/score";

export const runtime = "nodejs";
// Each run processes only JOB_FEED_BATCH clients (least-recently-fed first), so
// it finishes within the Vercel Hobby 10s cap — no plan upgrade needed. Run it
// daily; the cursor (watchlist_profiles.last_feed_at) rotates through everyone
// over a few days, then keeps refreshing oldest-first. Idempotent throughout.
export const maxDuration = 60;

// Tune for your source count: ~1 enabled source → ~5 fits in 10s; 2 sources → ~3.
const BATCH = Number(process.env.JOB_FEED_BATCH ?? 5);

type ProfileRow = ProfileForScoring & { client_id: string | null };

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const sources = await getEnabledSources();

  // Least-recently-fed active clients first (NULLs = never fed → highest priority).
  const { data: watchlistsRaw } = await supabase
    .from("watchlist_profiles")
    .select(`client_id, last_feed_at, ${SCORING_PROFILE_COLUMNS}`)
    .eq("subscription_status", "active")
    .order("last_feed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);
  const watchlists = (watchlistsRaw ?? []) as ProfileRow[];

  let clients = 0;
  let fetched = 0;
  let inserted = 0;
  let matched = 0;
  const errors: string[] = [];

  for (const profile of watchlists) {
    if (!profile.client_id) continue;
    clients++;
    try {
      const r = await ingestForClient(profile.client_id, profile, sources);
      fetched += r.fetched;
      inserted += r.inserted;
      matched += r.matched;
    } catch (err) {
      errors.push(`${profile.client_id}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Advance the cursor even on error so one bad client never blocks the queue.
      await supabase
        .from("watchlist_profiles")
        .update({ last_feed_at: new Date().toISOString() })
        .eq("client_id", profile.client_id);
    }
  }

  const summary = {
    sources: sources.map((s) => s.key),
    batch: BATCH,
    clients,
    fetched,
    inserted,
    matched,
    errors: errors.length,
  };

  // Observability: one automation_log row per run.
  try {
    await supabase.from("automation_log").insert({
      event_key: "job_feed_run",
      status: errors.length > 0 ? "failed" : "success",
      payload: summary,
      error_message: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
    });
  } catch {
    // logging must not break the response
  }

  console.log("[job-feed cron]", JSON.stringify(summary));
  return Response.json(summary);
}
