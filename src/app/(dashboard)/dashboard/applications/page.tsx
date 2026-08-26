import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, ArrowRight, Star, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MatchStatusSelect } from "@/components/dashboard/MatchStatusSelect";
import { ApplicationDetail, type AppDetailMatch, type DocOption } from "@/components/dashboard/ApplicationDetail";
import { TRACKER_STAGES, MATCH_STATUS_LABELS } from "@/lib/matching/status";
import { getWatchlistAccess, WatchlistInactiveNotice } from "@/lib/watchlist/access";

type MatchRow = AppDetailMatch & {
  job_id: string | null;
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
};

// Legacy 'offer' rows render under 'offer_received'.
function normalizeStatus(s: string): string {
  return s === "offer" ? "offer_received" : s;
}

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate when a watchlist subscription exists but isn't active.
  const { data: wl } = await supabase
    .from("watchlist_profiles")
    .select("subscription_status, access_source")
    .eq("client_id", user.id)
    .maybeSingle();
  if (wl) {
    const access = getWatchlistAccess(wl.subscription_status);
    if (!access.allowed) {
      return (
        <WatchlistInactiveNotice status={wl.subscription_status} accessSource={wl.access_source} />
      );
    }
  }

  const { data: matchesRaw } = await supabase
    .from("client_job_matches")
    .select(
      "id, job_id, status, rachel_recommended, application_date, interview_date, salary_offered, next_steps, client_notes, resume_document_id, cover_letter_document_id"
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const trackerKeys = new Set(TRACKER_STAGES.map((s) => s.key as string));
  const matches = ((matchesRaw ?? []) as MatchRow[]).filter((m) => trackerKeys.has(normalizeStatus(m.status)));

  const jobIds = [...new Set(matches.map((m) => m.job_id).filter(Boolean))] as string[];
  let jobs: JobRow[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("job_listings")
      .select("id, title, company, location, is_remote, url, salary_range")
      .in("id", jobIds);
    jobs = (data ?? []) as JobRow[];
  }
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j]));

  // The client's resumes + cover letters, for attaching to an application.
  const { data: docsRaw } = await supabase
    .from("documents")
    .select("id, filename, category")
    .eq("client_id", user.id)
    .in("category", ["resume", "resume_rewrite", "cover_letter"]);
  const documents = (docsRaw ?? []) as DocOption[];

  const grouped = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const key = normalizeStatus(m.status);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const count = (k: string) => grouped.get(k)?.length ?? 0;
  const stats = [
    { label: "Applied", value: count("applied") },
    { label: "Interviewing", value: count("interviewing") + count("final_interview") },
    { label: "Offers", value: count("offer_received") },
    { label: "Accepted", value: count("accepted") },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Application Tracker</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Keep track of every role you&apos;ve applied to, from first submission through offer.
          </p>
        </div>
        <Link
          href="/dashboard/watchlist"
          className="text-sm text-brand-700 font-medium hover:text-brand-800 flex items-center gap-1"
        >
          Back to watchlist <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">{s.label}</p>
            <p className="font-display text-2xl font-bold text-neutral-900">{s.value}</p>
          </div>
        ))}
      </div>

      {matches.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 mb-2">No applications tracked yet</h3>
          <p className="text-sm text-neutral-500 mb-5 max-w-sm mx-auto">
            Mark a job as Interested or Applied from your watchlist and it&apos;ll show up here so you can
            track it through the rest of the process.
          </p>
          <Button asChild>
            <Link href="/dashboard/watchlist">
              View watchlist <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {TRACKER_STAGES.map((stage) => {
            const list = grouped.get(stage.key) ?? [];
            if (list.length === 0) return null;
            const meta = MATCH_STATUS_LABELS[stage.key];
            return (
              <section key={stage.key}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display font-bold text-neutral-900 flex items-center gap-2">
                    <span>{stage.label}</span>
                    <span className="text-sm font-normal text-neutral-400">({list.length})</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {list.map((match) => {
                    const job = match.job_id ? jobMap[match.job_id] ?? null : null;
                    if (!job) return null;
                    return (
                      <div key={match.id} className="bg-white border border-neutral-200 rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                                {meta.label}
                              </span>
                              {match.rachel_recommended && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                  <Star className="h-3 w-3" /> Curated by Rachel
                                </span>
                              )}
                              {match.salary_offered && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                  Offer ${match.salary_offered.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-neutral-900">{job.title}</h3>
                            <p className="text-sm text-neutral-600">{job.company}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {job.location && <span className="text-xs text-neutral-400">{job.location}</span>}
                              {job.is_remote && <span className="text-xs text-brand-600 font-medium">Remote</span>}
                              {job.salary_range && <span className="text-xs text-neutral-400">{job.salary_range}</span>}
                            </div>
                            <ApplicationDetail match={match} documents={documents} />
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
