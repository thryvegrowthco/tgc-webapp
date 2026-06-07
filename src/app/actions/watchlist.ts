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
import { sendTemplated } from "@/lib/email/render";
import { createClientNotification } from "@/lib/notifications/client";
import { SCORING_PROFILE_COLUMNS as SCORING_COLUMNS } from "@/lib/job-api/ingest";
import type { MatchStatus } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://thryvegrowth.co";

// Shared list of columns the scoring engine reads (defined in the ingest lib so
// the cron, the JSearch fetch, and the auto-matcher all stay in sync).
const SCORING_PROFILE_COLUMNS = SCORING_COLUMNS;

// Best-effort: notify a client (in-app row + email) that new matches arrived.
async function notifyClientOfNewMatches(clientId: string, count: number): Promise<void> {
  if (count <= 0) return;
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", clientId)
      .single();
    const profile = data as { full_name: string | null; email: string } | null;
    const name = profile?.full_name || profile?.email?.split("@")[0] || "there";

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
          client_name: name,
          match_count: count,
          match_plural: count === 1 ? "" : "s",
          dashboard_url: `${APP_URL}/dashboard/watchlist`,
        },
      });
    }
  } catch (err) {
    console.error("[watchlist] notifyClientOfNewMatches failed:", err);
  }
}

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
  employmentTypes: string[];
  keywords: string[];
  skills: string[];
  certifications: string[];
  education: string;
  preferredEmployers: string[];
  excludedEmployers: string[];
  jobBoardPreferences: string[];
  workEnvironment: string;
  travelPreference: string;
  workAuthorizationNotes: string;
  mustHaves: string[];
  niceToHaves: string[];
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
    employment_types: input.employmentTypes,
    keywords: input.keywords,
    skills: input.skills,
    certifications: input.certifications,
    education: input.education || null,
    preferred_employers: input.preferredEmployers,
    excluded_employers: input.excludedEmployers,
    job_board_preferences: input.jobBoardPreferences,
    work_environment: input.workEnvironment || null,
    travel_preference: input.travelPreference || null,
    work_authorization_notes: input.workAuthorizationNotes || null,
    must_haves: input.mustHaves,
    nice_to_haves: input.niceToHaves,
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

    // Confirm the change to the client (in-app + email). First-time setup is
    // intentionally silent — it's part of onboarding, not an update.
    await createClientNotification({
      clientId: user.id,
      type: "watchlist_updated",
      title: "Your watchlist preferences were updated",
      body: "Future job searches will use your latest criteria.",
      link: "/dashboard/watchlist",
    });
    try {
      const { data: me } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      const p = me as { full_name: string | null; email: string } | null;
      if (p?.email) {
        await sendTemplated("watchlist_updated", {
          to: p.email,
          clientId: user.id,
          data: {
            client_name: p.full_name || p.email.split("@")[0],
            dashboard_url: `${APP_URL}/dashboard/watchlist`,
          },
        });
      }
    } catch (err) {
      console.error("[watchlist] watchlist_updated email failed:", err);
    }
  } else {
    await supabase.from("watchlist_profiles").insert(payload);
  }

  // Transition the Job Alerts booking row(s) for this user into intake_complete
  // so they join the same workflow pipeline as other services. Filling out
  // target_roles + industries IS the intake for Job Alerts subscribers.
  if (input.targetRoles.length > 0 || input.industries.length > 0) {
    await supabase
      .from("bookings")
      .update({ workflow_status: "intake_complete" })
      .eq("client_id", user.id)
      .eq("service_key", "job_alerts_monthly")
      .eq("workflow_status", "intake_needed");
  }

  redirect("/dashboard/watchlist");
}

const ALLOWED_MATCH_STATUSES: MatchStatus[] = [
  "interested", "applied", "interviewing", "final_interview",
  "offer_received", "accepted", "declined", "rejected", "withdrawn",
  "new", "saved", "not_a_fit", "archived", "offer",
];

export async function updateMatchStatus(matchId: string, status: string) {
  const { supabase, user } = await requireUser();

  if (!ALLOWED_MATCH_STATUSES.includes(status as MatchStatus)) return;

  // When the client marks a job applied, stamp the application date if unset.
  const patch: { status: MatchStatus; application_date?: string } = {
    status: status as MatchStatus,
  };
  if (status === "applied") {
    patch.application_date = new Date().toISOString().slice(0, 10);
  }

  await supabase
    .from("client_job_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("client_id", user.id); // can only update own matches
}

// Toggle the client-only favorite flag on one of their matches.
export async function toggleFavorite(matchId: string, value: boolean) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("client_job_matches")
    .update({ is_favorite: value })
    .eq("id", matchId)
    .eq("client_id", user.id);
  revalidatePath("/dashboard/watchlist");
}

// Update the client's private note on one of their matches.
export async function updateMatchNotes(matchId: string, notes: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("client_job_matches")
    .update({ client_notes: notes.trim() || null })
    .eq("id", matchId)
    .eq("client_id", user.id);
  revalidatePath("/dashboard/watchlist");
}

export interface ApplicationDetailsInput {
  salaryOffered: number | null;
  nextSteps: string;
  interviewDate: string | null; // ISO (yyyy-mm-dd) or null
  resumeDocumentId: string | null;
  coverLetterDocumentId: string | null;
}

// Client updates the tracker detail on one of their applications.
export async function updateApplicationDetails(matchId: string, input: ApplicationDetailsInput) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("client_job_matches")
    .update({
      salary_offered: input.salaryOffered,
      next_steps: input.nextSteps.trim() || null,
      interview_date: input.interviewDate || null,
      resume_document_id: input.resumeDocumentId,
      cover_letter_document_id: input.coverLetterDocumentId,
    })
    .eq("id", matchId)
    .eq("client_id", user.id);
  revalidatePath("/dashboard/applications");
  return { success: true };
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

export interface CurationInput {
  rachelNotes?: string;
  matchReason?: string;
  priorityLevel?: "high" | "medium" | "low" | "";
  recommendedAction?: string;
}

export async function assignJobToClient(
  clientId: string,
  jobId: string,
  curation?: CurationInput
) {
  await requireAdmin();
  const supabase = createServiceClient();

  // Upsert: do nothing if already assigned. ignoreDuplicates means .select()
  // returns the row only when a NEW match was created — so we notify exactly once.
  const { data: created } = await supabase
    .from("client_job_matches")
    .upsert(
      {
        client_id: clientId,
        job_id: jobId,
        status: "new",
        rachel_recommended: true,
        rachel_notes: curation?.rachelNotes?.trim() || null,
        match_reason: curation?.matchReason?.trim() || null,
        priority_level: curation?.priorityLevel || null,
        recommended_action: curation?.recommendedAction?.trim() || null,
      },
      { onConflict: "client_id,job_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  const match = created as { id: string } | null;
  if (match?.id) {
    await notifyCuratedMatch(clientId, jobId, match.id, curation);
  }
}

// Tell a client Rachel hand-picked a job for them (in-app + email).
async function notifyCuratedMatch(
  clientId: string,
  jobId: string,
  matchId: string,
  curation?: CurationInput
): Promise<void> {
  try {
    const service = createServiceClient();
    const [{ data: profileData }, { data: jobData }] = await Promise.all([
      service.from("profiles").select("full_name, email").eq("id", clientId).single(),
      service.from("job_listings").select("title, company").eq("id", jobId).single(),
    ]);
    const profile = profileData as { full_name: string | null; email: string } | null;
    const job = jobData as { title: string; company: string } | null;
    if (!job) return;

    await createClientNotification({
      clientId,
      type: "curated_job_match",
      title: `Rachel picked a job for you: ${job.title}`,
      body: `${job.company}${curation?.matchReason ? ` — ${curation.matchReason}` : ""}`,
      link: "/dashboard/watchlist",
      matchId,
    });

    if (profile?.email) {
      await sendTemplated("curated_job_match", {
        to: profile.email,
        clientId,
        data: {
          client_name: profile.full_name || profile.email.split("@")[0],
          job_title: job.title,
          company: job.company,
          match_reason: curation?.matchReason ?? "",
          recommended_action: curation?.recommendedAction ?? "",
          dashboard_url: `${APP_URL}/dashboard/watchlist`,
        },
      });
    }
  } catch (err) {
    console.error("[watchlist] notifyCuratedMatch failed:", err);
  }
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
    .select(SCORING_PROFILE_COLUMNS)
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

  let newlyAssigned = 0;
  if (matchesPayload.length > 0) {
    const { data: createdRows } = await supabase
      .from("client_job_matches")
      .upsert(matchesPayload, { onConflict: "client_id,job_id", ignoreDuplicates: true })
      .select("id");
    newlyAssigned = (createdRows ?? []).length;
  }

  if (newlyAssigned > 0) await notifyClientOfNewMatches(clientId, newlyAssigned);

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
    .select(SCORING_PROFILE_COLUMNS)
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
    await notifyClientOfNewMatches(clientId, matchesPayload.length);
  }

  revalidatePath(`/admin/watchlists/${clientId}`);
  revalidatePath("/dashboard/watchlist");

  return { evaluated: jobList.length, matched: matchesPayload.length };
}

// ─── Admin: edit a client's watchlist criteria directly ──────────────────────
export async function updateWatchlistProfileAsAdmin(
  clientId: string,
  input: WatchlistProfileInput
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();

  const payload = {
    target_roles: input.targetRoles,
    industries: input.industries,
    locations: input.locations,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    remote_preference: input.remotePreference,
    experience_level: input.experienceLevel || null,
    preferences_notes: input.preferencesNotes || null,
    employment_types: input.employmentTypes,
    keywords: input.keywords,
    skills: input.skills,
    certifications: input.certifications,
    education: input.education || null,
    preferred_employers: input.preferredEmployers,
    excluded_employers: input.excludedEmployers,
    job_board_preferences: input.jobBoardPreferences,
    work_environment: input.workEnvironment || null,
    travel_preference: input.travelPreference || null,
    work_authorization_notes: input.workAuthorizationNotes || null,
    must_haves: input.mustHaves,
    nice_to_haves: input.niceToHaves,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("watchlist_profiles")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) {
    await supabase.from("watchlist_profiles").update(payload).eq("client_id", clientId);
  } else {
    await supabase.from("watchlist_profiles").insert({ client_id: clientId, ...payload });
  }

  revalidatePath(`/admin/watchlists/${clientId}`);
  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

// ─── Admin: mark a submission reviewed (non-blocking curation surface) ────────
export async function setWatchlistReviewStatus(clientId: string, reviewed: boolean) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();
  await service
    .from("watchlist_profiles")
    .update({
      review_status: reviewed ? "reviewed" : "pending_review",
      reviewed_at: reviewed ? new Date().toISOString() : null,
      reviewed_by: reviewed ? user?.id ?? null : null,
    })
    .eq("client_id", clientId);

  revalidatePath("/admin");
  revalidatePath("/admin/watchlists");
  revalidatePath(`/admin/watchlists/${clientId}`);
  return { success: true };
}

// ─── Admin: subscription lifecycle overrides ─────────────────────────────────
// Acts on the real Stripe subscription when one exists (the webhook remains the
// source of truth and will re-sync), plus updates local status for immediate UI.
async function setSubscriptionStatus(
  clientId: string,
  localStatus: "active" | "paused" | "cancelled",
  stripeAction: "pause" | "resume" | "cancel" | "none"
): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  const service = createServiceClient();

  const { data: row } = await service
    .from("watchlist_profiles")
    .select("stripe_subscription_id")
    .eq("client_id", clientId)
    .maybeSingle();
  const subId = (row as { stripe_subscription_id: string | null } | null)?.stripe_subscription_id;

  if (subId && stripeAction !== "none") {
    try {
      const { stripe } = await import("@/lib/stripe/client");
      if (stripeAction === "pause") {
        await stripe.subscriptions.update(subId, { pause_collection: { behavior: "void" } });
      } else if (stripeAction === "resume") {
        await stripe.subscriptions.update(subId, { pause_collection: null });
      } else if (stripeAction === "cancel") {
        await stripe.subscriptions.cancel(subId);
      }
    } catch (err) {
      console.error("[watchlist] Stripe subscription update failed:", err);
      return { error: "Stripe update failed. Status not changed." };
    }
  }

  await service
    .from("watchlist_profiles")
    .update({ subscription_status: localStatus, updated_at: new Date().toISOString() })
    .eq("client_id", clientId);

  revalidatePath("/admin");
  revalidatePath(`/admin/watchlists/${clientId}`);
  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function pauseWatchlist(clientId: string) {
  return setSubscriptionStatus(clientId, "paused", "pause");
}

export async function reactivateWatchlist(clientId: string) {
  return setSubscriptionStatus(clientId, "active", "resume");
}

export async function cancelWatchlist(clientId: string) {
  return setSubscriptionStatus(clientId, "cancelled", "cancel");
}

// ─── Admin: toggle an automated job-feed source on/off ───────────────────────
export async function toggleJobSource(provider: string, enabled: boolean) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();
  await service
    .from("job_sources")
    .update({ enabled, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq("provider", provider);

  revalidatePath("/admin/integrations");
  return { success: true };
}
