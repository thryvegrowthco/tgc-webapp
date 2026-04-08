import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, ExternalLink, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WatchlistManager } from "@/components/admin/WatchlistManager";

export const metadata: Metadata = {
  title: "Manage Watchlist — Admin",
  robots: { index: false, follow: false },
};

type MatchRow = {
  id: string;
  job_id: string | null;
  status: string;
  rachel_recommended: boolean;
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

type ProfileRow = {
  full_name: string | null;
  email: string;
};

type WatchlistRow = {
  target_roles: string[] | null;
  industries: string[] | null;
  locations: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  remote_preference: string | null;
  experience_level: string | null;
  preferences_notes: string | null;
};

export default async function AdminWatchlistClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [profileResult, watchlistResult, matchesResult] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", clientId).single(),
    supabase
      .from("watchlist_profiles")
      .select(
        "target_roles, industries, locations, salary_min, salary_max, remote_preference, experience_level, preferences_notes"
      )
      .eq("client_id", clientId)
      .maybeSingle(),
    supabase
      .from("client_job_matches")
      .select("id, job_id, status, rachel_recommended, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data as ProfileRow | null;
  if (!profile) notFound();

  const watchlist = watchlistResult.data as WatchlistRow | null;
  const matches = (matchesResult.data ?? []) as MatchRow[];

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

  const statusColors: Record<string, string> = {
    new: "bg-brand-100 text-brand-700",
    saved: "bg-blue-100 text-blue-700",
    interested: "bg-purple-100 text-purple-700",
    applied: "bg-yellow-100 text-yellow-700",
    interviewing: "bg-orange-100 text-orange-700",
    offer: "bg-green-100 text-green-700",
    not_a_fit: "bg-neutral-100 text-neutral-500",
    archived: "bg-neutral-100 text-neutral-400",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/watchlists"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All Watchlists
        </Link>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          {profile.full_name ?? profile.email}&apos;s Watchlist
        </h1>
        {profile.full_name && (
          <p className="text-sm text-neutral-400 mt-0.5">{profile.email}</p>
        )}
      </div>

      {/* Preferences summary */}
      {watchlist && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold text-neutral-900 text-sm mb-3">Client Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {watchlist.target_roles && watchlist.target_roles.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Target Roles</p>
                <p className="text-neutral-700">{watchlist.target_roles.join(", ")}</p>
              </div>
            )}
            {watchlist.locations && watchlist.locations.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Locations</p>
                <p className="text-neutral-700">{watchlist.locations.join(", ")}</p>
              </div>
            )}
            {watchlist.industries && watchlist.industries.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Industries</p>
                <p className="text-neutral-700">{watchlist.industries.join(", ")}</p>
              </div>
            )}
            {watchlist.remote_preference && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Remote</p>
                <p className="text-neutral-700 capitalize">{watchlist.remote_preference}</p>
              </div>
            )}
            {(watchlist.salary_min || watchlist.salary_max) && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Salary</p>
                <p className="text-neutral-700">
                  {watchlist.salary_min ? `$${watchlist.salary_min.toLocaleString()}` : ""}
                  {watchlist.salary_min && watchlist.salary_max ? " – " : ""}
                  {watchlist.salary_max ? `$${watchlist.salary_max.toLocaleString()}` : ""}
                </p>
              </div>
            )}
            {watchlist.experience_level && (
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Experience</p>
                <p className="text-neutral-700 capitalize">{watchlist.experience_level}</p>
              </div>
            )}
          </div>
          {watchlist.preferences_notes && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-neutral-600 leading-relaxed">{watchlist.preferences_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* WatchlistManager: add jobs, fetch from JSearch */}
      <WatchlistManager clientId={clientId} />

      {/* Job matches */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900 text-sm">
            Job Matches ({matches.length})
          </h2>
        </div>

        {matches.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-neutral-400">No matches yet. Add jobs using the tools above.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {matches.map((match) => {
              const job = match.job_id ? jobMap[match.job_id] ?? null : null;
              if (!job) return null;
              const statusColor = statusColors[match.status] ?? statusColors.new;

              return (
                <div key={match.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor}`}
                        >
                          {match.status.replace("_", " ")}
                        </span>
                        {match.rachel_recommended && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="h-3 w-3" /> Rachel&apos;s Pick
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
                        {job.is_remote && (
                          <span className="text-xs text-brand-600 font-medium">Remote</span>
                        )}
                        {job.salary_range && (
                          <span className="text-xs text-neutral-400">{job.salary_range}</span>
                        )}
                      </div>
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
