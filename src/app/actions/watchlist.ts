"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { searchJobs, normalizeJob } from "@/lib/job-api/jsearch";

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

  // Get watchlist profile
  const { data: profile } = await supabase
    .from("watchlist_profiles")
    .select("target_roles, locations, remote_preference")
    .eq("client_id", clientId)
    .single();

  if (!profile) return { error: "No watchlist profile found." };

  const roles = (profile.target_roles as string[] | null) ?? [];
  const locations = (profile.locations as string[] | null) ?? [];
  const isRemote = (profile.remote_preference as string) === "remote";

  if (roles.length === 0) return { error: "No target roles set on profile." };

  const query = roles.slice(0, 3).join(" OR ");
  const location = !isRemote && locations.length > 0 ? locations[0] : undefined;

  const rawJobs = await searchJobs({ query, location, isRemote, numPages: 1 });
  if (rawJobs.length === 0) return { fetched: 0, inserted: 0 };

  const normalized = rawJobs.map(normalizeJob);

  // Get existing external_ids for dedup
  const externalIds = normalized.map((j) => j.external_id).filter(Boolean) as string[];
  const { data: existing } = await supabase
    .from("job_listings")
    .select("external_id")
    .in("external_id", externalIds);
  const existingIds = new Set((existing ?? []).map((r) => (r as { external_id: string | null }).external_id));

  const toInsert = normalized.filter(
    (j) => j.external_id && !existingIds.has(j.external_id)
  );

  let inserted = 0;
  if (toInsert.length > 0) {
    const { data: insertedRows } = await supabase
      .from("job_listings")
      .insert(toInsert)
      .select("id");
    inserted = insertedRows?.length ?? 0;

    // Auto-assign all newly inserted jobs to this client
    if (insertedRows && insertedRows.length > 0) {
      const matches = insertedRows.map((r) => ({
        client_id: clientId,
        job_id: (r as { id: string }).id,
        status: "new" as const,
        rachel_recommended: false,
      }));
      await supabase
        .from("client_job_matches")
        .upsert(matches, { onConflict: "client_id,job_id", ignoreDuplicates: true });
    }
  }

  return { fetched: rawJobs.length, inserted };
}
