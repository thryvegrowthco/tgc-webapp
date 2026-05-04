"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { searchJobs, normalizeJob } from "@/lib/job-api/jsearch";
import {
  scoreJobAgainstProfile,
  shouldIncludeMatch,
  type ProfileForScoring,
  type JobForScoring,
} from "@/lib/matching/score";

// ─── Auth helpers ──────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const p = profile as { role: string } | null;
  if (p?.role !== "admin") redirect("/dashboard");

  return supabase;
}

// ─── Client actions ────────────────────────────────────────────────────────

export interface WatchlistProfileInput {
  targetRoles: string[];
  industries: string[];
  locations: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  remotePreference: "remote" | "hybrid" | "onsite" | "any";
  experienceLevel: string;
  preferencesNotes: string;
}

export async function saveWatchlistProfile(input: WatchlistProfileInput) {
  const { supabase, user } = await requireUser();

  const payload = {
    client_id: user.id,
    target_roles: input.targetRoles,
    industries: input.industries,
    locations: input.locations,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    remote_preference: input.remotePreference,
    experience_level: input.experienceLevel || null,
    preferences_notes: input.preferencesNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("watchlist_profiles")
    .select("id")
    .eq("client_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("watchlist_profiles")
      .update(payload)
      .eq("client_id", user.id);
  } else {
    await supabase.from("watchlist_profiles").insert(payload);
  }

  redirect("/dashboard/watchlist");
}

export async function updateMatchStatus(matchId: string, status: string) {
  const { supabase, user } = await requireUser();

  const allowed = [
    "new", "saved", "interested", "applied", "not_a_fit",
    "archived", "interviewing", "offer",
  ];
  if (!allowed.includes(status)) return;

  type MatchStatus =
    | "new" | "saved" | "interested" | "applied"
    | "not_a_fit" | "archived" | "interviewing" | "offer";

  await supabase
    .from("client_job_matches")
    .update({ status: status as MatchStatus })
    .eq("id", matchId)
    .eq("client_id", user.id); // can only update own matches
}

// ─── Admin actions ─────────────────────────────────────────────────────────

export async function addManualJob(formData: FormData) {
  await requireAdmin();
  const supabase = createServiceClient();

  const job = {
    title: (formData.get("title") as string).trim(),
    company: (formData.get("company") as string).trim(),
    location: (formData.get("location") as string).trim() || null,
    is_remote: formData.get("is_remote") === "true",
    url: (formData.get("url") as string).trim() || null,
    description: (formData.get("description") as string).trim() || null,
    salary_range: (formData.get("salary_range") as string).trim() || null,
    source: "manual" as const,
    external_id: null,
    date_posted: new Date().toISOString().slice(0, 10),
    is_active: true,
  };

  const { data, error } = await supabase
    .from("job_listings")
    .insert(job)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[addManualJob]", error);
    return { error: "Failed to add job." };
  }

  return { jobId: data.id };
}

export async function assignJobToClient(clientId: string, jobId: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  // Upsert: do nothing if already assigned
  await supabase
    .from("client_job_matches")
    .upsert(
      {
        client_id: clientId,
        job_id: jobId,
        status: "new",
        rachel_recommended: true,
      },
      { onConflict: "client_id,job_id", ignoreDuplicates: true }
    );
}

export async function toggleRachelRecommended(matchId: string, value: boolean) {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase
    .from("client_job_matches")
    .update({ rachel_recommended: value })
    .eq("id", matchId);
}

export async function removeJobMatch(matchId: string) {
  await requireAdmin();
  const supabase = createServiceClient();
  await supabase.from("client_job_matches").delete().eq("id", matchId);
}

export async function fetchJSearchJobsForClient(clientId: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: profileRaw } = await supabase
    .from("watchlist_profiles")
    .select("target_roles, industries, locations, salary_min, salary_max, remote_preference, experience_level")
    .eq("client_id", clientId)
    .single();

  const profile = profileRaw as ProfileForScoring | null;
  if (!profile) return { error: "No watchlist profile found." };

  const roles = profile.target_roles ?? [];
  const locations = profile.locations ?? [];
  const isRemote = profile.remote_preference === "remote";

  if (roles.length === 0) return { error: "No target roles set on profile." };

  const query = roles.slice(0, 3).join(" OR ");
  const location = !isRemote && locations.length > 0 ? locations[0] : undefined;

  const rawJobs = await searchJobs({ query, location, isRemote, numPages: 1 });
  if (rawJobs.length === 0) return { fetched: 0, inserted: 0, matched: 0 };

  const normalized = rawJobs.map(normalizeJob);

  // Dedup existing job_listings by external_id
  const externalIds = normalized.map((j) => j.external_id).filter(Boolean) as string[];
  const { data: existing } = await supabase
    .from("job_listings")
    .select("id, external_id")
    .in("external_id", externalIds);
  const existingByExtId = new Map(
    ((existing ?? []) as { id: string; external_id: string | null }[])
      .filter((r) => r.external_id)
      .map((r) => [r.external_id as string, r.id])
  );

  const toInsert = normalized.filter(
    (j) => j.external_id && !existingByExtId.has(j.external_id)
  );

  let insertedJobIds: string[] = [];
  if (toInsert.length > 0) {
    const { data: insertedRows } = await supabase
      .from("job_listings")
      .insert(toInsert)
      .select("id, external_id");
    insertedJobIds = ((insertedRows ?? []) as { id: string; external_id: string | null }[])
      .map((r) => r.id);
    for (const row of (insertedRows ?? []) as { id: string; external_id: string | null }[]) {
      if (row.external_id) existingByExtId.set(row.external_id, row.id);
    }
  }

  // Score every fetched job (both new and pre-existing) and only assign matches above threshold
  let matched = 0;
  const matchesPayload: Array<{
    client_id: string;
    job_id: string;
    status: "new";
    rachel_recommended: boolean;
    score: number;
    score_label: "strong" | "good" | "maybe";
  }> = [];

  for (let i = 0; i < normalized.length; i++) {
    const norm = normalized[i];
    if (!norm.external_id) continue;
    const jobId = existingByExtId.get(norm.external_id);
    if (!jobId) continue;

    const jobForScoring: JobForScoring = {
      title: norm.title,
      company: norm.company,
      location: norm.location,
      is_remote: norm.is_remote,
      description: norm.description,
      salary_range: norm.salary_range,
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
    matched++;
  }

  if (matchesPayload.length > 0) {
    await supabase
      .from("client_job_matches")
      .upsert(matchesPayload, { onConflict: "client_id,job_id", ignoreDuplicates: true });
  }

  revalidatePath(`/admin/watchlists/${clientId}`);
  revalidatePath("/dashboard/watchlist");

  return {
    fetched: rawJobs.length,
    inserted: insertedJobIds.length,
    matched,
  };
}

// Score every active job_listing (last 60 days) against this client's
// watchlist profile, inserting any new matches above the score threshold.
// Existing matches (already assigned) are skipped.
export async function runAutoMatchForClient(clientId: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: profileRaw } = await supabase
    .from("watchlist_profiles")
    .select("target_roles, industries, locations, salary_min, salary_max, remote_preference, experience_level")
    .eq("client_id", clientId)
    .maybeSingle();

  const profile = profileRaw as ProfileForScoring | null;
  if (!profile) return { error: "No watchlist profile found." };
  if (!profile.target_roles || profile.target_roles.length === 0) {
    return { error: "No target roles set on profile." };
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: jobs } = await supabase
    .from("job_listings")
    .select("id, title, company, location, is_remote, description, salary_range")
    .eq("is_active", true)
    .gte("created_at", sixtyDaysAgo);

  const jobList = (jobs ?? []) as Array<{ id: string } & JobForScoring>;
  if (jobList.length === 0) return { evaluated: 0, matched: 0 };

  const { data: existingMatchesRaw } = await supabase
    .from("client_job_matches")
    .select("job_id")
    .eq("client_id", clientId);
  const existingJobIds = new Set(
    ((existingMatchesRaw ?? []) as { job_id: string | null }[])
      .map((r) => r.job_id)
      .filter(Boolean) as string[]
  );

  const matchesPayload: Array<{
    client_id: string;
    job_id: string;
    status: "new";
    rachel_recommended: boolean;
    score: number;
    score_label: "strong" | "good" | "maybe";
  }> = [];

  for (const job of jobList) {
    if (existingJobIds.has(job.id)) continue;
    const result = scoreJobAgainstProfile(profile, job);
    if (!shouldIncludeMatch(result.score) || !result.label) continue;
    matchesPayload.push({
      client_id: clientId,
      job_id: job.id,
      status: "new",
      rachel_recommended: result.label === "strong",
      score: result.score,
      score_label: result.label,
    });
  }

  if (matchesPayload.length > 0) {
    await supabase
      .from("client_job_matches")
      .insert(matchesPayload);
  }

  revalidatePath(`/admin/watchlists/${clientId}`);
  revalidatePath("/dashboard/watchlist");

  return { evaluated: jobList.length, matched: matchesPayload.length };
}
