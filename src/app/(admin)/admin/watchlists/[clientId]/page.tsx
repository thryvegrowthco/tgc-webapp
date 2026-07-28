import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ExternalLink, MapPin } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { WatchlistManager } from "@/components/admin/WatchlistManager";
import { WatchlistAdminControls } from "@/components/admin/WatchlistAdminControls";
import { WatchlistSetupForm } from "@/components/dashboard/WatchlistSetupForm";
import { RunAutoMatchButton } from "@/components/admin/RunAutoMatchButton";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "Manage Watchlist — Admin",
  robots: { index: false, follow: false },
};

type MatchRow = {
  id: string;
  job_id: string | null;
  status: string;
  rachel_recommended: boolean;
  score: number | null;
  score_label: string | null;
  match_reason: string | null;
  priority_level: string | null;
  recommended_action: string | null;
  rachel_notes: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  url: string | null;
  salary_range: string | null;
  date_posted: string | null;
  source: string | null;
};

type ProfileRow = { full_name: string | null; email: string };
type WatchlistRow = Database["public"]["Tables"]["watchlist_profiles"]["Row"];

export default async function AdminWatchlistClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { clientId } = await params;
  const { tab } = await searchParams;
  const inactiveTab = tab === "inactive";
  const supabase = await createClient();

  const [profileResult, watchlistResult, matchesResult] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", clientId).single(),
    supabase.from("watchlist_profiles").select("*").eq("client_id", clientId).maybeSingle(),
    supabase
      .from("client_job_matches")
      .select(
        "id, job_id, status, rachel_recommended, score, score_label, match_reason, priority_level, recommended_action, rachel_notes, created_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data as ProfileRow | null;
  if (!profile) notFound();

  const watchlist = watchlistResult.data as WatchlistRow | null;
  const matches = (matchesResult.data ?? []) as MatchRow[];
  // Split expired (system-closed postings) into an Inactive tab so they leave
  // the active list; everything else (incl. archived/not_a_fit) stays on Active.
  const expiredMatches = matches.filter((m) => m.status === "expired");
  const activeMatches = matches.filter((m) => m.status !== "expired");
  const shownMatches = inactiveTab ? expiredMatches : activeMatches;

  const jobIds = [...new Set(matches.map((m) => m.job_id).filter(Boolean))] as string[];
  let jobs: JobRow[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("job_listings")
      .select("id, title, company, location, is_remote, url, salary_range, date_posted, source")
      .in("id", jobIds);
    jobs = (data ?? []) as JobRow[];
  }
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  const initialData = watchlist
    ? {
        targetRoles: watchlist.target_roles ?? [],
        industries: watchlist.industries ?? [],
        locations: watchlist.locations ?? [],
        salaryMin: watchlist.salary_min,
        salaryMax: watchlist.salary_max,
        remotePreference: watchlist.remote_preference ?? "any",
        experienceLevel: watchlist.experience_level,
        preferencesNotes: watchlist.preferences_notes,
        employmentTypes: watchlist.employment_types ?? [],
        keywords: watchlist.keywords ?? [],
        skills: watchlist.skills ?? [],
        certifications: watchlist.certifications ?? [],
        education: watchlist.education,
        preferredEmployers: watchlist.preferred_employers ?? [],
        excludedEmployers: watchlist.excluded_employers ?? [],
        jobBoardPreferences: watchlist.job_board_preferences ?? [],
        workEnvironment: watchlist.work_environment,
        travelPreference: watchlist.travel_preference,
        workAuthorizationNotes: watchlist.work_authorization_notes,
        mustHaves: watchlist.must_haves ?? [],
        niceToHaves: watchlist.nice_to_haves ?? [],
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[
        { label: "Watchlists", href: "/admin/watchlists" },
        { label: profile.full_name ?? profile.email },
      ]} />

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          {profile.full_name ?? profile.email}&apos;s Watchlist
        </h1>
        {profile.full_name && (
          <p className="text-sm text-neutral-400 mt-0.5">{profile.email}</p>
        )}
      </div>

      {/* Subscription + review controls */}
      {watchlist && (
        <WatchlistAdminControls
          clientId={clientId}
          subscriptionStatus={watchlist.subscription_status}
          reviewStatus={watchlist.review_status}
        />
      )}

      {/* Preferences summary */}
      {watchlist && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold text-neutral-900 text-sm mb-3">Client Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <PrefArray label="Target Roles" values={watchlist.target_roles} />
            <PrefArray label="Industries" values={watchlist.industries} />
            <PrefArray label="Locations" values={watchlist.locations} />
            {watchlist.remote_preference && <Pref label="Remote" value={watchlist.remote_preference} />}
            {(watchlist.salary_min || watchlist.salary_max) && (
              <Pref
                label="Salary"
                value={`${watchlist.salary_min ? `$${watchlist.salary_min.toLocaleString()}` : ""}${
                  watchlist.salary_min && watchlist.salary_max ? " – " : ""
                }${watchlist.salary_max ? `$${watchlist.salary_max.toLocaleString()}` : ""}`}
              />
            )}
            {watchlist.experience_level && <Pref label="Experience" value={watchlist.experience_level} />}
            <PrefArray label="Employment Type" values={watchlist.employment_types} />
            <PrefArray label="Keywords" values={watchlist.keywords} />
            <PrefArray label="Skills" values={watchlist.skills} />
            <PrefArray label="Certifications" values={watchlist.certifications} />
            {watchlist.education && <Pref label="Education" value={watchlist.education} />}
            <PrefArray label="Employers of Interest" values={watchlist.preferred_employers} />
            <PrefArray label="Employers to Exclude" values={watchlist.excluded_employers} />
            <PrefArray label="Job Boards" values={watchlist.job_board_preferences} />
            {watchlist.work_environment && <Pref label="Work Environment" value={watchlist.work_environment} />}
            {watchlist.travel_preference && <Pref label="Travel" value={watchlist.travel_preference} />}
            <PrefArray label="Must-Haves" values={watchlist.must_haves} />
            <PrefArray label="Nice-To-Haves" values={watchlist.nice_to_haves} />
            {watchlist.work_authorization_notes && (
              <Pref label="Work Authorization" value={watchlist.work_authorization_notes} />
            )}
          </div>
          {watchlist.preferences_notes && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-neutral-600 leading-relaxed">{watchlist.preferences_notes}</p>
            </div>
          )}

          {/* Collapsible admin editor */}
          <details className="mt-4 pt-4 border-t border-neutral-100">
            <summary className="cursor-pointer text-sm font-medium text-brand-700">Edit criteria</summary>
            <div className="mt-4">
              <WatchlistSetupForm initialData={initialData} adminClientId={clientId} />
            </div>
          </details>
        </div>
      )}

      {/* WatchlistManager: add jobs, fetch from JSearch */}
      <WatchlistManager
        clientId={clientId}
        watchlistProfile={
          watchlist
            ? {
                target_roles: watchlist.target_roles,
                industries: watchlist.industries,
                skills: watchlist.skills,
                must_haves: watchlist.must_haves,
                preferences_notes: watchlist.preferences_notes,
              }
            : null
        }
      />

      {/* Auto-match */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 flex items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-semibold text-neutral-900">Auto-match against existing jobs</p>
          <p className="text-neutral-500 text-xs mt-0.5">
            Scores every active job in the database against this client&apos;s preferences and
            adds new matches above the threshold.
          </p>
        </div>
        <RunAutoMatchButton clientId={clientId} />
      </div>

      {/* Job matches */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 pt-4 border-b border-neutral-100">
          <div className="flex items-center gap-1">
            <MatchTab
              clientId={clientId}
              tab="active"
              active={!inactiveTab}
              label={`Job Matches (${activeMatches.length})`}
            />
            <MatchTab
              clientId={clientId}
              tab="inactive"
              active={inactiveTab}
              label={`Inactive (${expiredMatches.length})`}
            />
          </div>
        </div>

        {shownMatches.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-neutral-400">
              {inactiveTab
                ? "No expired matches. When a posting closes or passes its deadline, its match moves here."
                : "No matches yet. Add jobs using the tools above."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {shownMatches.map((match) => {
              const job = match.job_id ? jobMap[match.job_id] ?? null : null;
              if (!job) return null;
              const statusColor = STATUS_COLORS[match.status] ?? STATUS_COLORS.new;
              const curated = match.rachel_recommended || job.source === "manual";

              return (
                <div key={match.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor}`}>
                          {match.status.replace(/_/g, " ")}
                        </span>
                        {curated && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="h-3 w-3" /> Curated by Rachel
                          </span>
                        )}
                        {match.priority_level && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityColor(match.priority_level)}`}>
                            {match.priority_level} priority
                          </span>
                        )}
                        {match.score !== null && match.score_label && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreLabelColor(match.score_label)}`}>
                            {match.score}% · {match.score_label}
                          </span>
                        )}
                        {job.source === "jsearch" && (
                          <span className="text-xs text-neutral-300 font-medium">API</span>
                        )}
                      </div>
                      <p className="font-semibold text-neutral-900 text-sm">{job.title}</p>
                      <p className="text-xs text-neutral-600">{job.company}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {job.location && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400">
                            <MapPin className="h-3 w-3" /> {job.location}
                          </span>
                        )}
                        {job.is_remote && <span className="text-xs text-brand-600 font-medium">Remote</span>}
                        {job.salary_range && <span className="text-xs text-neutral-400">{job.salary_range}</span>}
                      </div>
                      {match.match_reason && (
                        <p className="text-xs text-neutral-600 mt-1.5"><span className="font-medium">Why:</span> {match.match_reason}</p>
                      )}
                      {match.recommended_action && (
                        <p className="text-xs text-neutral-600 mt-0.5"><span className="font-medium">Next:</span> {match.recommended_action}</p>
                      )}
                      {match.rachel_notes && (
                        <p className="text-xs text-neutral-400 mt-0.5 italic">Private note: {match.rachel_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-brand-700 hover:text-brand-800 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchTab({
  clientId,
  tab,
  active,
  label,
}: {
  clientId: string;
  tab: "active" | "inactive";
  active: boolean;
  label: string;
}) {
  const href = tab === "active" ? `/admin/watchlists/${clientId}` : `/admin/watchlists/${clientId}?tab=inactive`;
  return (
    <Link
      href={href}
      className={
        "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
        (active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-neutral-500 hover:text-neutral-800")
      }
    >
      {label}
    </Link>
  );
}

function Pref({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-neutral-700 capitalize">{value}</p>
    </div>
  );
}

function PrefArray({ label, values }: { label: string; values: string[] | null }) {
  if (!values || values.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-neutral-700">{values.join(", ")}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-brand-100 text-brand-700",
  saved: "bg-blue-100 text-blue-700",
  interested: "bg-purple-100 text-purple-700",
  applied: "bg-yellow-100 text-yellow-700",
  interviewing: "bg-orange-100 text-orange-700",
  final_interview: "bg-orange-100 text-orange-700",
  offer_received: "bg-green-100 text-green-700",
  offer: "bg-green-100 text-green-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-neutral-100 text-neutral-500",
  rejected: "bg-red-100 text-red-600",
  withdrawn: "bg-neutral-100 text-neutral-500",
  not_a_fit: "bg-neutral-100 text-neutral-500",
  archived: "bg-neutral-100 text-neutral-400",
  expired: "bg-neutral-200 text-neutral-500",
};

function priorityColor(p: string): string {
  switch (p) {
    case "high": return "bg-red-100 text-red-700";
    case "medium": return "bg-amber-100 text-amber-700";
    case "low": return "bg-neutral-100 text-neutral-600";
    default: return "bg-neutral-100 text-neutral-500";
  }
}

function scoreLabelColor(label: string): string {
  switch (label) {
    case "strong": return "bg-green-100 text-green-700";
    case "good": return "bg-brand-100 text-brand-700";
    case "maybe": return "bg-neutral-100 text-neutral-600";
    default: return "bg-neutral-100 text-neutral-500";
  }
}
