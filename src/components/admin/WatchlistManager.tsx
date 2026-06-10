"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AiAssistPanel } from "@/components/admin/AiAssistPanel";
import { buildJobMatchPrompt, buildCoverLetterPrompt, splitInOrder } from "@/lib/ai/prompts";
import {
  addManualJob,
  assignJobToClient,
  fetchJSearchJobsForClient,
  toggleRachelRecommended,
  removeJobMatch,
} from "@/app/actions/watchlist";

export interface WatchlistProfileContext {
  target_roles?: string[] | null;
  industries?: string[] | null;
  skills?: string[] | null;
  must_haves?: string[] | null;
  preferences_notes?: string | null;
}

interface Props {
  clientId: string;
  watchlistProfile?: WatchlistProfileContext | null;
}

export function WatchlistManager({ clientId, watchlistProfile }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [fetchingJobs, setFetchingJobs] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Controlled so the "Draft with ChatGPT" prompt reads live values and the
  // paste-back can write match_reason / recommended_action. They keep `name`, so
  // FormData still serializes them on submit.
  const [title, setTitle] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [matchReason, setMatchReason] = React.useState("");
  const [recommendedAction, setRecommendedAction] = React.useState("");

  const jobContext = {
    jobTitle: title,
    company,
    jobDescription: description,
    targetRoles: watchlistProfile?.target_roles ?? null,
    industries: watchlistProfile?.industries ?? null,
    skills: watchlistProfile?.skills ?? null,
    mustHaves: watchlistProfile?.must_haves ?? null,
    preferencesNotes: watchlistProfile?.preferences_notes ?? null,
  };

  // ── Manual job add ──────────────────────────────────────────────────────
  async function handleManualJobSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await addManualJob(formData);

    if ("error" in result) {
      toast.error(result.error ?? "Failed to add job.");
      setSubmitting(false);
      return;
    }

    // Assign the new job to this client, with Rachel's curation metadata. This
    // tags it "Curated by Rachel" and notifies the client (in-app + email).
    const priority = (formData.get("priority_level") as string) || "";
    await assignJobToClient(clientId, result.jobId, {
      matchReason: (formData.get("match_reason") as string) || "",
      rachelNotes: (formData.get("rachel_notes") as string) || "",
      priorityLevel: priority as "high" | "medium" | "low" | "",
      recommendedAction: (formData.get("recommended_action") as string) || "",
    });
    toast.success("Job curated and sent to the client.");
    setShowAddForm(false);
    setSubmitting(false);
    setTitle("");
    setCompany("");
    setDescription("");
    setMatchReason("");
    setRecommendedAction("");
    router.refresh();
  }

  // ── JSearch fetch ────────────────────────────────────────────────────────
  async function handleFetchJSearch() {
    setFetchingJobs(true);
    const result = await fetchJSearchJobsForClient(clientId);
    if ("error" in result) {
      toast.error(result.error ?? "Failed to fetch jobs.");
    } else {
      toast.success(`Fetched ${result.fetched} jobs — ${result.inserted} new added to client.`);
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

      {showAddForm && (
        <form onSubmit={handleManualJobSubmit} className="border border-neutral-100 rounded-xl p-4 space-y-3 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-700 mb-2">New Job</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Job Title *</label>
              <input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HR Manager" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Company *</label>
              <input name="company" required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" className={fieldClass} />
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
            <textarea name="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief job description… (paste the posting for a better AI draft)" className={fieldClass} />
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

          {/* Rachel's curation — surfaced to the client as "Curated by Rachel" */}
          <div className="pt-3 mt-1 border-t border-neutral-200">
            <p className="text-xs font-semibold text-brand-700 mb-2">Your curation (shown to the client)</p>

            <div className="space-y-3">
              <AiAssistPanel
                label="Draft why-it-matches & action with ChatGPT"
                applyHint="Paste ChatGPT's reply (with ### MATCH REASON and ### RECOMMENDED ACTION) to fill both fields below."
                applyLabel="Apply to curation fields"
                prompt={buildJobMatchPrompt(jobContext)}
                onApply={(raw) => {
                  const [reason, action] = splitInOrder(raw, ["MATCH REASON", "RECOMMENDED ACTION"]);
                  if (reason) setMatchReason(reason);
                  if (action) setRecommendedAction(action);
                  toast.success("Draft applied — review the fields below.");
                }}
              />
              <AiAssistPanel
                label="Draft a cover letter with ChatGPT"
                instructions="Drafts a tailored cover letter for this job. Copy it and save it as a deliverable for the client if you want."
                prompt={buildCoverLetterPrompt(jobContext)}
              />

              <div>
                <label className={labelClass}>Why it matches</label>
                <textarea
                  name="match_reason"
                  rows={2}
                  value={matchReason}
                  onChange={(e) => setMatchReason(e.target.value)}
                  placeholder="A sentence on why this is a strong fit for them…"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select name="priority_level" defaultValue="" className={fieldClass}>
                    <option value="">No priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Recommended action</label>
                  <input
                    name="recommended_action"
                    value={recommendedAction}
                    onChange={(e) => setRecommendedAction(e.target.value)}
                    placeholder="e.g. Apply this week; mention referral"
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Private notes (admin only)</label>
                <textarea
                  name="rachel_notes"
                  rows={2}
                  placeholder="Notes for yourself — not shown to the client."
                  className={fieldClass}
                />
              </div>
            </div>
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
