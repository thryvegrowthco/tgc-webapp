import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, ArrowRight, Star, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MatchStatusSelect } from "@/components/dashboard/MatchStatusSelect";

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-brand-100 text-brand-700" },
  saved: { label: "Saved", color: "bg-blue-100 text-blue-700" },
  interested: { label: "Interested", color: "bg-purple-100 text-purple-700" },
  applied: { label: "Applied", color: "bg-yellow-100 text-yellow-700" },
  interviewing: { label: "Interviewing", color: "bg-orange-100 text-orange-700" },
  offer: { label: "Offer", color: "bg-green-100 text-green-700" },
  not_a_fit: { label: "Not a Fit", color: "bg-neutral-100 text-neutral-500" },
  archived: { label: "Archived", color: "bg-neutral-100 text-neutral-400" },
};

type MatchRow = {
  id: string;
  job_id: string | null;
  status: string;
  rachel_recommended: boolean;
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
};

export default async function WatchlistPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: watchlistProfile } = await supabase
    .from("watchlist_profiles")
    .select("id, subscription_status")
    .eq("client_id", user.id)
    .maybeSingle();

  if (!watchlistProfile) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-neutral-900">Job Watchlist</h1>
          <p className="text-neutral-500 mt-1 text-sm">Curated job matches delivered to you.</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 mb-2">Set up your watchlist</h3>
          <p className="text-sm text-neutral-500 mb-5 max-w-sm mx-auto">
            Tell Rachel what you&apos;re looking for and she&apos;ll curate job matches for you — both manually and via automated feeds.
          </p>
          <Button asChild>
            <Link href="/dashboard/watchlist/setup">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fetch matches (excluding archived/not_a_fit) then fetch job details separately
  const { data: matchesRaw } = await supabase
    .from("client_job_matches")
    .select("id, job_id, status, rachel_recommended")
    .eq("client_id", user.id)
    .not("status", "in", '("archived","not_a_fit")')
    .order("created_at", { ascending: false });

  const matches = (matchesRaw ?? []) as MatchRow[];

  const jobIds = [...new Set(matches.map((m) => m.job_id).filter(Boolean))] as string[];
  let jobs: JobRow[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("job_listings")
      .select("id, title, company, location, is_remote, url, salary_range, date_posted")
      .in("id", jobIds);
    jobs = (data ?? []) as JobRow[];
  }
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Job Watchlist</h1>
          <p className="text-neutral-500 mt-1 text-sm">Your curated job matches.</p>
        </div>
        <Link
          href="/dashboard/watchlist/setup"
          className="text-sm text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1"
        >
          Edit preferences <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => {
            const job = match.job_id ? jobMap[match.job_id] ?? null : null;
            if (!job) return null;
            const { label, color } = statusLabels[match.status] ?? statusLabels.new;

            return (
              <div key={match.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                      {match.rachel_recommended && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3" /> Rachel&apos;s Pick
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-neutral-900">{job.title}</h3>
                    <p className="text-sm text-neutral-600">{job.company}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {job.location && <span className="text-xs text-neutral-400">{job.location}</span>}
                      {job.is_remote && <span className="text-xs text-brand-600 font-medium">Remote</span>}
                      {job.salary_range && <span className="text-xs text-neutral-400">{job.salary_range}</span>}
                      {job.date_posted && (
                        <span className="text-xs text-neutral-400">
                          Posted {new Date(job.date_posted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <MatchStatusSelect matchId={match.id} currentStatus={match.status} />
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">View</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <p className="text-sm text-neutral-500">
            No active matches yet. Rachel will add jobs as she finds good fits for your profile.
          </p>
        </div>
      )}
    </div>
  );
}
