// Shared display helpers for sessions / booking invitations.
// Used by finalizeSession (emails), the admin invitation builder, the public
// booking page, and the admin Sessions view so labels stay consistent.

import { formatCentralDate, formatCentralTime } from "@/lib/time/central";

export type LocationType = "google_meet" | "phone" | "in_person" | "custom";

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  google_meet: "Google Meet",
  phone: "Phone Call",
  in_person: "In Person",
  custom: "Custom",
};

export function meetingTypeLabel(type: string | null | undefined): string {
  if (!type) return "Google Meet";
  return LOCATION_TYPE_LABELS[type as LocationType] ?? type;
}

/** A short human "where" line — the address/phone/instructions, not the Meet link. */
export function meetingLocationLine(
  type: string | null | undefined,
  details: string | null | undefined
): string {
  const t = (type ?? "google_meet") as LocationType;
  if (t === "google_meet") return details ? details : "";
  if (t === "phone") return details ? details : "Phone call";
  return details ?? "";
}

/** "60 minutes" / "1 hour" / "1 hour 30 minutes". */
export function formatDuration(minutes: number | null | undefined): string {
  const m = minutes ?? 60;
  if (m < 60) return `${m} minutes`;
  const hours = Math.floor(m / 60);
  const rem = m % 60;
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`;
  if (rem === 0) return hourPart;
  return `${hourPart} ${rem} minutes`;
}

/**
 * Status pill copy for a session's `workflow_status`. Shared by the client
 * session workspace, the client "My Sessions" list, and the dashboard overview
 * so the client sees the same label everywhere.
 */
export const SESSION_STATUS_COPY: Record<string, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-yellow-100 text-yellow-700" },
  intake_needed: { label: "Intake needed", className: "bg-yellow-100 text-yellow-700" },
  intake_complete: { label: "Intake complete", className: "bg-blue-100 text-blue-700" },
  session_scheduled: { label: "Session scheduled", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  follow_up_sent: { label: "Wrapped up", className: "bg-neutral-100 text-neutral-700" },
  rescheduled: { label: "Rescheduled", className: "bg-blue-100 text-blue-700" },
  no_show: { label: "No show", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
};

export function sessionStatusInfo(workflowStatus: string | null | undefined): {
  label: string;
  className: string;
} {
  return SESSION_STATUS_COPY[workflowStatus ?? ""] ?? SESSION_STATUS_COPY.booked;
}

/**
 * Human "when" line for a client session. Prefers the scheduled moment in
 * Central time, falls back to an availability slot (date-only bookings that
 * were never finalized to a session_at), then to a placeholder.
 */
export function sessionWhenLine(
  sessionAt: string | null | undefined,
  slot?: { slot_date: string; start_time: string } | null
): string {
  if (sessionAt) {
    const when = formatCentralDate(sessionAt, { weekday: "short", month: "long", day: "numeric" });
    return `${when} · ${formatCentralTime(sessionAt)} (CT)`;
  }
  if (slot) {
    const date = new Date(`${slot.slot_date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
    });
    return `${date} · ${slot.start_time}`;
  }
  return "Time to be confirmed";
}
