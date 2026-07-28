// Shared match-status presentation. Imported by the client watchlist page,
// the application tracker, MatchStatusSelect, and the admin views so labels +
// colors stay consistent. Pure module — safe in both server and client code.

import type { MatchStatus } from "@/types/database";

export const MATCH_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-brand-100 text-brand-700" },
  saved: { label: "Saved", color: "bg-blue-100 text-blue-700" },
  interested: { label: "Interested", color: "bg-purple-100 text-purple-700" },
  applied: { label: "Applied", color: "bg-yellow-100 text-yellow-700" },
  interviewing: { label: "Interviewing", color: "bg-orange-100 text-orange-700" },
  final_interview: { label: "Final Interview", color: "bg-orange-100 text-orange-700" },
  offer_received: { label: "Offer Received", color: "bg-green-100 text-green-700" },
  offer: { label: "Offer Received", color: "bg-green-100 text-green-700" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-neutral-100 text-neutral-500" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600" },
  withdrawn: { label: "Withdrawn", color: "bg-neutral-100 text-neutral-500" },
  not_a_fit: { label: "Not a Fit", color: "bg-neutral-100 text-neutral-500" },
  archived: { label: "Archived", color: "bg-neutral-100 text-neutral-400" },
  // System-set when a posting closes / passes its deadline (see expire-matches cron).
  expired: { label: "Expired", color: "bg-neutral-200 text-neutral-500" },
};

// Options shown in the client status dropdown (legacy 'offer' hidden; new rows
// written use 'offer_received').
export const MATCH_STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "saved", label: "Saved" },
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "final_interview", label: "Final Interview" },
  { value: "offer_received", label: "Offer Received" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "not_a_fit", label: "Not a Fit" },
  { value: "archived", label: "Archived" },
];

// Application-tracker pipeline stages, in order. Statuses outside this set
// (new/saved) are pre-application and don't appear in the tracker.
export const TRACKER_STAGES: { key: MatchStatus; label: string }[] = [
  { key: "interested", label: "Interested" },
  { key: "applied", label: "Applied" },
  { key: "interviewing", label: "Interviewing" },
  { key: "final_interview", label: "Final Interview" },
  { key: "offer_received", label: "Offer Received" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

// Statuses that count as "in the application tracker" (active applications).
export const TRACKED_STATUSES: MatchStatus[] = TRACKER_STAGES.map((s) => s.key).concat("offer");

export function matchStatusLabel(status: string): string {
  return MATCH_STATUS_LABELS[status]?.label ?? status;
}

export function matchStatusColor(status: string): string {
  return MATCH_STATUS_LABELS[status]?.color ?? "bg-neutral-100 text-neutral-600";
}
