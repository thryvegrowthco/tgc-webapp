// Shared ingest pipeline: fetch jobs from a set of sources for one client,
// dedup, store, score, assign matches, and notify. Used by the automated feed
// cron (/api/cron/job-feed). Pure-ish — creates its own service client; never
// throws (returns zeroed counts on failure).

import { createServiceClient } from "@/lib/supabase/service";
import {
  scoreJobAgainstProfile,
  shouldIncludeMatch,
  type ProfileForScoring,
  type JobForScoring,
} from "@/lib/matching/score";
import { createClientNotification } from "@/lib/notifications/client";
import { sendTemplated } from "@/lib/email/render";
import type { JobSource, NormalizedJob } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

// All columns the scoring engine reads. Shared by the admin fetch action and
// the automated feed so both pass the full profile to scoreJobAgainstProfile.
export const SCORING_PROFILE_COLUMNS =
  "target_roles, industries, locations, salary_min, salary_max, remote_preference, experience_level, keywords, skills, certifications, preferred_employers, excluded_employers, must_haves, nice_to_haves";

export interface IngestResult {
  fetched: number;
  inserted: number;
  matched: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ingestForClient(
  clientId: string,
  profile: ProfileForScoring,
  sources: JobSource[]
): Promise<IngestResult> {
  const roles = profile.target_roles ?? [];
  if (roles.length === 0 || sources.length === 0) return { fetched: 0, inserted: 0, matched: 0 };

  const supabase = createServiceClient();
  const locations = profile.locations ?? [];
  const isRemote = profile.remote_preference === "remote";
  const query = roles.slice(0, 3).join(" OR ");
  const location = !isRemote && locations.length > 0 ? locations[0] : undefined;

  // 1. Fetch from every enabled source (polite delay between calls).
  const fetched: NormalizedJob[] = [];
  for (let i = 0; i < sources.length; i++) {
    const jobs = await sources[i].search({ query, roles, location, isRemote, numPages: 1 });
    fetched.push(...jobs);
    if (i < sources.length - 1) await sleep(200);
  }
  if (fetched.length === 0) return { fetched: 0, inserted: 0, matched: 0 };

  // Dedup within this batch by external_id.
  const byExtId = new Map<string, NormalizedJob>();
  for (const job of fetched) {
    if (job.external_id && !byExtId.has(job.external_id)) byExtId.set(job.external_id, job);
  }
  const unique = [...byExtId.values()];
  const externalIds = unique.map((j) => j.external_id);

  // 2. Dedup against existing job_listings.
  const { data: existing } = await supabase
    .from("job_listings")
    .select("id, external_id")
    .in("external_id", externalIds);
  const idByExt = new Map<string, string>(
    ((existing ?? []) as { id: string; external_id: string | null }[])
      .filter((r) => r.external_id)
      .map((r) => [r.external_id as string, r.id])
  );

  const toInsert = unique.filter((j) => !idByExt.has(j.external_id));
  let inserted = 0;
  if (toInsert.length > 0) {
    const { data: insertedRows } = await supabase
      .from("job_listings")
      .insert(toInsert)
      .select("id, external_id");
    for (const row of (insertedRows ?? []) as { id: string; external_id: string | null }[]) {
      if (row.external_id) idByExt.set(row.external_id, row.id);
    }
    inserted = (insertedRows ?? []).length;
  }

  // 3. Score + assign matches above threshold.
  const matchesPayload: Array<{
    client_id: string;
    job_id: string;
    status: "new";
    rachel_recommended: boolean;
    score: number;
    score_label: "strong" | "good" | "maybe";
  }> = [];
  for (const job of unique) {
    const jobId = idByExt.get(job.external_id);
    if (!jobId) continue;
    const jobForScoring: JobForScoring = {
      title: job.title,
      company: job.company,
      location: job.location,
      is_remote: job.is_remote,
      description: job.description,
      salary_range: job.salary_range,
    };
    const result = scoreJobAgainstProfile(profile, jobForScoring);
    if (!shouldIncludeMatch(result.score) || !result.label) continue;
    matchesPayload.push({
      client_id: clientId,
      job_id: jobId,
      status: "new",
      rachel_recommended: result.label === "strong",
      score: result.score,
      score_label: result.label,
    });
  }

  let matched = 0;
  if (matchesPayload.length > 0) {
    const { data: createdRows } = await supabase
      .from("client_job_matches")
      .upsert(matchesPayload, { onConflict: "client_id,job_id", ignoreDuplicates: true })
      .select("id");
    matched = (createdRows ?? []).length;
  }

  if (matched > 0) await notifyNewMatches(clientId, matched);

  return { fetched: fetched.length, inserted, matched };
}

async function notifyNewMatches(clientId: string, count: number): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from("profiles").select("full_name, email").eq("id", clientId).single();
    const profile = data as { full_name: string | null; email: string } | null;

    await createClientNotification({
      clientId,
      type: "new_job_match",
      title: `${count} new job match${count === 1 ? "" : "es"} in your watchlist`,
      body: "Review them on your job watchlist.",
      link: "/dashboard/watchlist",
    });

    if (profile?.email) {
      await sendTemplated("new_job_match", {
        to: profile.email,
        clientId,
        data: {
          client_name: profile.full_name || profile.email.split("@")[0],
          match_count: count,
          match_plural: count === 1 ? "" : "s",
          dashboard_url: `${APP_URL}/dashboard/watchlist`,
        },
      });
    }
  } catch (err) {
    console.error("[ingest] notifyNewMatches failed:", err);
  }
}
