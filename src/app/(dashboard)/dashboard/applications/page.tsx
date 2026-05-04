import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, ArrowRight, Star, ExternalLink, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MatchStatusSelect } from "@/components/dashboard/MatchStatusSelect";

const TRACKER_STATUSES = ["applied", "interviewing", "offer", "not_a_fit"] as const;
type TrackerStatus = (typeof TRACKER_STATUSES)[number];

const statusMeta: Record<TrackerStatus, { label: string; color: string; description: string }> = {
  applied: {
    label: "Applied",
    color: "bg-yellow-100 text-yellow-700",
    description: "Submitted, waiting to hear back.",
  },
  interviewing: {
    label: "Interviewing",
    color: "bg-orange-100 text-orange-700",
    description: "In the interview process.",
  },
  offer: {
    label: "Offer",
    color: "bg-green-100 text-green-700",
    description: "An offer is on the table.",
  },
  not_a_fit: {
    label: "Not a Fit",
    color: "bg-neutral-100 text-neutral-500",
    description: "Didn't move forward.",
  },
};

type MatchRow = {
  id: string;
  job_id: string | null;
  status: string;
  rachel_recommended: boolean;
  application_date: string | null;
  interview_date: string | null;
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

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matchesRaw } = await supabase
    .from("client_job_matches")
    .select("id, job_id, status, rachel_recommended, application_date, interview_date")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const matches = ((matchesRaw ?? []) as MatchRow[]).filter((m) =>
    (TRACKER_STATUSES as readonly string[]).includes(m.status)
  );

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

  const grouped: Record<TrackerStatus, MatchRow[]> = {
    applied: [],
    interviewing: [],
    offer: [],
    not_a_fit: [],
  };
  for (const m of matches) {
    if (TRACKER_STATUSES.includes(m.status as TrackerStatus)) {
      grouped[m.status as TrackerStatus].push(m);
    }
  }

  const totalActive = grouped.applied.length + grouped.interviewing.length + grouped.offer.length;

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

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {TRACKER_STATUSES.map((s) => (
          <div key={s} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
              {statusMeta[s].label}
            </p>
            <p className="font-display text-2xl font-bold text-neutral-900">
              {grouped[s].length}
            </p>
          </div>
        ))}
      </div>

      {totalActive === 0 && grouped.not_a_fit.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="h-5 w-5 text-brand-600" />
          </div>
          <h3 className="font-display font-bold text-neutral-900 mb-2">No applications tracked yet</h3>
          <p className="text-sm text-neutral-500 mb-5 max-w-sm mx-auto">
            Mark a job as Applied from your watchlist and it&apos;ll show up here so you can track it
            through the rest of the process.
          </p>
          <Button asChild>
            <Link href="/dashboard/watchlist">
              View watchlist <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {TRACKER_STATUSES.map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            const meta = statusMeta[status];
            return (
              <section key={status}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display font-bold text-neutral-900 flex items-center gap-2">
                    <span>{meta.label}</span>
                    <span className="text-sm font-normal text-neutral-400">({list.length})</span>
                  </h2>
                  <p className="text-xs text-neutral-500">{meta.description}</p>
                </div>
                <div className="space-y-3">
                  {list.map((match) => {
                    const job = match.job_id ? jobMap[match.job_id] ?? null : null;
                    if (!job) return null;
                    return (
                      <ApplicationCard
                        key={match.id}
                        match={match}
                        job={job}
                        statusColor={meta.color}
                        statusLabel={meta.label}
                      />
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

function ApplicationCard({
  match,
  job,
  statusColor,
  statusLabel,
}: {
  match: MatchRow;
  job: JobRow;
  statusColor: string;
  statusLabel: string;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
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
          </div>
          {(match.application_date || match.interview_date) && (
            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-neutral-500">
              {match.application_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Applied {formatDate(match.application_date)}
                </span>
              )}
              {match.interview_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Interview {formatDate(match.interview_date)}
                </span>
              )}
            </div>
          )}
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
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
