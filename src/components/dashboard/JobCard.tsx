"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, ExternalLink, StickyNote, MapPin } from "lucide-react";
import { toast } from "sonner";
import { MatchStatusSelect } from "@/components/dashboard/MatchStatusSelect";
import { MATCH_STATUS_LABELS } from "@/lib/matching/status";
import { toggleFavorite, updateMatchNotes } from "@/app/actions/watchlist";

export interface JobCardMatch {
  id: string;
  status: string;
  rachel_recommended: boolean;
  score: number | null;
  score_label: string | null;
  match_reason: string | null;
  recommended_action: string | null;
  priority_level: string | null;
  client_notes: string | null;
  is_favorite: boolean;
}

export interface JobCardJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  is_remote: boolean;
  url: string | null;
  salary_range: string | null;
  date_posted: string | null;
  source: string | null;
}

export function JobCard({ match, job }: { match: JobCardMatch; job: JobCardJob }) {
  const router = useRouter();
  const [favorite, setFavorite] = React.useState(match.is_favorite);
  const [favBusy, setFavBusy] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState(false);
  const [note, setNote] = React.useState(match.client_notes ?? "");
  const [noteBusy, setNoteBusy] = React.useState(false);

  const status = MATCH_STATUS_LABELS[match.status] ?? MATCH_STATUS_LABELS.new;
  const curated = match.rachel_recommended || job.source === "manual";

  async function onToggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    setFavBusy(true);
    await toggleFavorite(match.id, next);
    setFavBusy(false);
    router.refresh();
  }

  async function onSaveNote() {
    setNoteBusy(true);
    await updateMatchNotes(match.id, note);
    setNoteBusy(false);
    setEditingNote(false);
    toast.success("Note saved.");
    router.refresh();
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            {curated && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Star className="h-3 w-3" /> Curated by Rachel
              </span>
            )}
            {match.score !== null && match.score_label && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  match.score_label === "strong"
                    ? "bg-green-100 text-green-700"
                    : match.score_label === "good"
                    ? "bg-brand-100 text-brand-700"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {match.score}% match
              </span>
            )}
          </div>

          <h3 className="font-semibold text-neutral-900">{job.title}</h3>
          <p className="text-sm text-neutral-600">{job.company}</p>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {job.location && (
              <span className="inline-flex items-center gap-0.5 text-xs text-neutral-400">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
            )}
            {job.is_remote && <span className="text-xs text-brand-600 font-medium">Remote</span>}
            {job.salary_range && <span className="text-xs text-neutral-400">{job.salary_range}</span>}
            {job.date_posted && (
              <span className="text-xs text-neutral-400">
                Posted {new Date(job.date_posted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            <span className="text-xs text-neutral-300">{job.source === "manual" ? "Handpicked" : "Auto-matched"}</span>
          </div>

          {match.match_reason && (
            <p className="text-xs text-neutral-600 mt-2">
              <span className="font-medium text-amber-700">Why Rachel picked this:</span> {match.match_reason}
            </p>
          )}
          {match.recommended_action && (
            <p className="text-xs text-neutral-600 mt-0.5">
              <span className="font-medium">Recommended next step:</span> {match.recommended_action}
            </p>
          )}

          {/* Client note */}
          {editingNote ? (
            <div className="mt-3">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Your private note about this job…"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  onClick={onSaveNote}
                  disabled={noteBusy}
                  className="text-xs font-medium text-white bg-brand-700 hover:bg-brand-800 rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {noteBusy ? "Saving…" : "Save note"}
                </button>
                <button
                  onClick={() => {
                    setNote(match.client_notes ?? "");
                    setEditingNote(false);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : match.client_notes ? (
            <button
              onClick={() => setEditingNote(true)}
              className="mt-2 text-left text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 w-full hover:bg-neutral-100"
            >
              <span className="font-medium">My note:</span> {match.client_notes}
            </button>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={onToggleFavorite}
            disabled={favBusy}
            aria-pressed={favorite}
            aria-label={favorite ? "Remove favorite" : "Add favorite"}
            className="text-neutral-300 hover:text-amber-500 disabled:opacity-50"
          >
            <Star className={`h-5 w-5 ${favorite ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
          <MatchStatusSelect matchId={match.id} currentStatus={match.status} />
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Apply</span>
            </a>
          )}
          {!match.client_notes && !editingNote && (
            <button
              onClick={() => setEditingNote(true)}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
            >
              <StickyNote className="h-3.5 w-3.5" /> Note
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
