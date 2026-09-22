// Automated job feed — pulls jobs from every enabled source for every active
// watchlist client, scores + dedups + assigns matches, and notifies clients of
// new ones. Triggered daily by cron-job.org (see docs/integrations.md).
//
// Distinct from /api/cron/job-alerts (which only emails a weekly digest of
// already-assigned matches). This is the engine that *creates* matches.
//
// Response model. cron-job.org closes any request after 30 s, and one run here
// takes anywhere from 10 s to over a minute (two external job APIs plus Resend,
// all awaited in series). So the handler authenticates, reads the batch, and
// answers 202 straight away; the ingest itself runs in after(), which Vercel
// keeps alive up to maxDuration. Consequences:
//   - cron-job.org only ever sees the ack. A 401/500 there still means a human
//     must act (bad secret, unreachable DB) — those happen before the ack.
//   - The run's real outcome lives in automation_log (exactly one job_feed_run
//     row per run) and, when it had errors, in an email to ADMIN_EMAIL.

import type { NextRequest } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAuthorized } from "@/lib/cron/auth";
import { sendAdminAlert } from "@/lib/email/resend";
import { getEnabledSources } from "@/lib/job-api/sources";
import { ingestForClient, SCORING_PROFILE_COLUMNS } from "@/lib/job-api/ingest";
import type { JobSource } from "@/lib/job-api/types";
import type { ProfileForScoring } from "@/lib/matching/score";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
// Budget for the after() work — the Vercel Hobby/Fluid maximum. Every outbound
// fetch in the adapters carries its own AbortSignal.timeout, so the worst case
// is ~45 s per client with both sources; BATCH × that stays well inside this.
export const maxDuration = 300;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

// Clients per run, least-recently-fed first. The cursor
// (watchlist_profiles.last_feed_at) rotates through everyone over a few days,
// then keeps refreshing oldest-first. Bounds external API usage per run — set
// 3 when both sources are enabled. Idempotent throughout.
const BATCH = Number(process.env.JOB_FEED_BATCH ?? 5);

type ProfileRow = ProfileForScoring & { client_id: string | null };
type FeedProfile = ProfileForScoring & { client_id: string };
type ServiceClient = ReturnType<typeof createServiceClient>;

type RunSummary = {
  sources: string[];
  batch: number;
  clients: number;
  fetched: number;
  inserted: number;
  matched: number;
  errors: number;
  durationMs: number;
};

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const supabase = createServiceClient();
  const sources = await getEnabledSources();
  const sourceKeys = sources.map((s) => s.key);

  // Least-recently-fed active clients first (NULLs = never fed → highest priority).
  const { data, error } = await supabase
    .from("watchlist_profiles")
    .select(`client_id, last_feed_at, ${SCORING_PROFILE_COLUMNS}`)
    .eq("subscription_status", "active")
    .order("last_feed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH);

  if (error) {
    // Pre-flight failure: nothing was scheduled and a human must look. Keep it
    // on the response so cron-job.org's failure notification fires.
    const message = `preflight: ${error.message}`;
    await logRun(supabase, "failed", { sources: sourceKeys, batch: BATCH }, message);
    console.error("[job-feed cron]", message);
    return Response.json({ error: message }, { status: 500 });
  }

  const watchlists = ((data ?? []) as ProfileRow[]).filter(
    (p): p is FeedProfile => Boolean(p.client_id)
  );

  after(() => runFeed(supabase, sources, watchlists));

  return Response.json(
    { accepted: true, batch: BATCH, sources: sourceKeys, clients: watchlists.length },
    { status: 202 }
  );
}

async function runFeed(supabase: ServiceClient, sources: JobSource[], watchlists: FeedProfile[]) {
  const startedAt = Date.now();
  let clients = 0;
  let fetched = 0;
  let inserted = 0;
  let matched = 0;
  const errors: string[] = [];

  try {
    for (const profile of watchlists) {
      clients++;
      try {
        const r = await ingestForClient(profile.client_id, profile, sources);
        fetched += r.fetched;
        inserted += r.inserted;
        matched += r.matched;
      } catch (err) {
        errors.push(`${profile.client_id}: ${describe(err)}`);
      } finally {
        // Advance the cursor even on error so one bad client never blocks the queue.
        await supabase
          .from("watchlist_profiles")
          .update({ last_feed_at: new Date().toISOString() })
          .eq("client_id", profile.client_id);
      }
    }
  } catch (err) {
    // Next only console.errors a throw inside after(); own it here so the
    // ledger row and the alert still happen.
    errors.push(`run: ${describe(err)}`);
  }

  const summary: RunSummary = {
    sources: sources.map((s) => s.key),
    batch: BATCH,
    clients,
    fetched,
    inserted,
    matched,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
  };
  const failure = errors.length > 0 ? errors.slice(0, 5).join("; ") : null;

  await logRun(supabase, failure ? "failed" : "success", summary, failure);
  console.log("[job-feed cron]", JSON.stringify(summary));

  if (failure) await alertAdmin(summary, errors);
}

// Observability: exactly one automation_log row per run (or per failed pre-flight).
async function logRun(
  supabase: ServiceClient,
  status: "success" | "failed",
  payload: Json,
  errorMessage: string | null
) {
  try {
    await supabase.from("automation_log").insert({
      event_key: "job_feed_run",
      status,
      payload,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error("[job-feed cron] automation_log write failed:", describe(err));
  }
}

// cron-job.org can no longer see a failed run (it only gets the 202), so a run
// with errors goes to Rachel by email. Email only, on purpose: it must not be
// silenceable by the notification toggles, and the bell's type enum would need
// a migration. Best-effort — never throws.
async function alertAdmin(summary: RunSummary, errors: string[]) {
  try {
    const { error } = await sendAdminAlert({
      subject: "Automated job search hit a problem",
      headline: "Automated job search hit a problem",
      body:
        "Today's automated job search finished with errors. Nothing is lost — it runs again tomorrow — but if this repeats, a job board key or connection probably needs attention.",
      fields: [
        { label: "Clients processed", value: String(summary.clients) },
        { label: "Sources", value: summary.sources.join(", ") || "none enabled" },
        { label: "Jobs fetched / matches", value: `${summary.fetched} / ${summary.matched}` },
        { label: "Errors", value: errors.slice(0, 3).join(" | ") },
      ],
      ctaUrl: `${APP_URL}/admin/integrations`,
      ctaLabel: "Check job sources",
    });
    // The Resend SDK resolves { data: null, error } rather than throwing.
    if (error) console.error("[job-feed cron] admin alert not sent:", error);
  } catch (err) {
    console.error("[job-feed cron] admin alert failed:", describe(err));
  }
}
