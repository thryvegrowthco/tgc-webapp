import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { JobCard, type JobCardMatch, type JobCardJob } from "@/components/dashboard/JobCard";
import { getWatchlistAccess, WatchlistInactiveNotice } from "@/lib/watchlist/access";

type MatchRow = JobCardMatch & { job_id: string | null };

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { view } = await searchParams;
  const savedView = view === "saved";
  const inactiveView = view === "inactive";

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
            Tell Rachel what you&apos;re looking for and she&apos;ll curate job matches for you, both manually and through automated feeds.
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

  // Gate job-alerts content when the subscription is not active.
  const access = getWatchlistAccess(watchlistProfile.subscription_status);
  if (!access.allowed) {
    return <WatchlistInactiveNotice status={watchlistProfile.subscription_status} />;
  }

  const { data: matchesRaw } = await supabase
    .from("client_job_matches")
    .select(
      "id, job_id, status, rachel_recommended, score, score_label, match_reason, recommended_action, priority_level, client_notes, is_favorite"
    )
    .eq("client_id", user.id)
    .not("status", "in", '("archived","not_a_fit")')
    .order("created_at", { ascending: false });

  // The query already excludes archived/not_a_fit; split the rest into active vs
  // expired (system-closed postings) so expired ones move to the Inactive tab.
  const fetchedMatches = (matchesRaw ?? []) as MatchRow[];
  const expiredMatches = fetchedMatches.filter((m) => m.status === "expired");
  const activeMatches = fetchedMatches.filter((m) => m.status !== "expired");
  const matches = inactiveView
    ? expiredMatches
    : savedView
    ? activeMatches.filter((m) => m.is_favorite || m.status === "saved")
    : activeMatches;

  const jobIds = [...new Set(matches.map((m) => m.job_id).filter(Boolean))] as string[];
  let jobs: JobCardJob[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("job_listings")
      .select("id, title, company, location, is_remote, url, salary_range, date_posted, source")
      .in("id", jobIds);
    jobs = (data ?? []) as JobCardJob[];
  }
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  const savedCount = activeMatches.filter((m) => m.is_favorite || m.status === "saved").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-neutral-200">
        <Tab href="/dashboard/watchlist" active={!savedView && !inactiveView} label={`All Matches (${activeMatches.length})`} />
        <Tab href="/dashboard/watchlist?view=saved" active={savedView} label={`Saved & Favorites (${savedCount})`} />
        <Tab href="/dashboard/watchlist?view=inactive" active={inactiveView} label={`Inactive (${expiredMatches.length})`} />
      </div>

      {matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => {
            const job = match.job_id ? jobMap[match.job_id] ?? null : null;
            if (!job) return null;
            return <JobCard key={match.id} match={match} job={job} />;
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center">
          <p className="text-sm text-neutral-500">
            {inactiveView
              ? "Nothing here yet. When a job posting closes or passes its deadline, that match moves here so your active list stays current."
              : savedView
              ? "No saved or favorited jobs yet. Tap the star on any match to save it here."
              : "No active matches yet. Rachel will add jobs as she finds good fits for your profile."}
          </p>
        </div>
      )}
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
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
