// Shared display helpers for sessions / booking invitations.
// Used by finalizeSession (emails), the admin invitation builder, the public
// booking page, and the admin Sessions view so labels stay consistent.

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
