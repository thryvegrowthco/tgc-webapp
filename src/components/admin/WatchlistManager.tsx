"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addManualJob,
  assignJobToClient,
  fetchJSearchJobsForClient,
  toggleRachelRecommended,
  removeJobMatch,
} from "@/app/actions/watchlist";

interface Props {
  clientId: string;
}

export function WatchlistManager({ clientId }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [fetchingJobs, setFetchingJobs] = React.useState(false);
  const [fetchResult, setFetchResult] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // ── Manual job add ──────────────────────────────────────────────────────
  async function handleManualJobSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await addManualJob(formData);

    if ("error" in result) {
      alert(result.error);
      setSubmitting(false);
      return;
    }

    // Assign the new job to this client
    await assignJobToClient(clientId, result.jobId);
    setShowAddForm(false);
    setSubmitting(false);
    router.refresh();
  }

  // ── JSearch fetch ────────────────────────────────────────────────────────
  async function handleFetchJSearch() {
    setFetchingJobs(true);
    setFetchResult(null);
    const result = await fetchJSearchJobsForClient(clientId);
    if ("error" in result) {
      setFetchResult(result.error ?? "Unknown error");
    } else {
      setFetchResult(
        `Fetched ${result.fetched} jobs from JSearch — ${result.inserted} new added to client.`
      );
    }
    setFetchingJobs(false);
    router.refresh();
  }

  const fieldClass =
    "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-neutral-600 mb-1";

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-neutral-900 text-sm">Add Jobs</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFetchJSearch}
            disabled={fetchingJobs}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetchingJobs ? "animate-spin" : ""}`} />
            {fetchingJobs ? "Fetching…" : "Fetch from JSearch"}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Manually
          </Button>
        </div>
      </div>

      {fetchResult && (
        <p className="text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2">
          {fetchResult}
        </p>
      )}

      {showAddForm && (
        <form onSubmit={handleManualJobSubmit} className="border border-neutral-100 rounded-xl p-4 space-y-3 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-700 mb-2">New Job</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Job Title *</label>
              <input name="title" required placeholder="e.g. HR Manager" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Company *</label>
              <input name="company" required placeholder="e.g. Acme Corp" className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Location</label>
              <input name="location" placeholder="e.g. Chicago, IL" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Salary Range</label>
              <input name="salary_range" placeholder="e.g. $80k–$100k" className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Application URL</label>
            <input name="url" type="url" placeholder="https://..." className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea name="description" rows={2} placeholder="Brief job description…" className={fieldClass} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_remote"
              id="is_remote"
              value="true"
              className="rounded border-neutral-300"
            />
            <label htmlFor="is_remote" className="text-xs text-neutral-600">Remote position</label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adding…" : "Add Job"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// Exported for use from the matches list if needed
export { toggleRachelRecommended, removeJobMatch };
