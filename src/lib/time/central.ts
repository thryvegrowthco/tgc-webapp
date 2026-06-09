// Central Time helpers — the canonical timezone for Rachel's business.
//
// `America/Chicago` is the IANA identifier; the tz database handles US DST
// transitions automatically, so we don't hardcode -05:00 or -06:00 offsets.
//
// Use `localCentralToUtcIso(date, time)` whenever Rachel's wall-clock input
// (e.g., a slot picked from her calendar) needs to be stored as a true UTC
// moment in TIMESTAMPTZ columns.
//
// Use `formatCentralDate / Time / DateTime` whenever you display a UTC moment
// to a user — toLocaleString without an explicit timeZone falls back to the
// Node process TZ (often UTC on Vercel) and silently shows the wrong day or
// time near midnight.

export const CENTRAL_TIMEZONE = "America/Chicago";
export const CENTRAL_TIMEZONE_LABEL = "CT";

/**
 * Convert a Central-wall-clock date + time into a UTC ISO string.
 * Handles DST automatically via the IANA tz database.
 *
 * @param dateStr ISO date like `"2026-06-03"`
 * @param timeStr Time of day like `"14:00"` or `"14:00:00"`
 */
export function localCentralToUtcIso(dateStr: string, timeStr: string): string {
  const fullTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  // Step 1: build a Date by reading the wall-clock as if it were UTC.
  // That Date is `offsetMinutes` minutes off from the true UTC moment we want.
  const asIfUtc = new Date(`${dateStr}T${fullTime}Z`);
  // Step 2: probe the offset, but sample it at the *candidate* UTC instant, not
  // at `asIfUtc` (which sits 5–6h earlier). On a DST-transition day, sampling at
  // `asIfUtc` can return the pre-transition offset for an early-morning pick
  // whose true moment is past the transition — storing it an hour off. Refining
  // against the candidate instant fixes those edge cases and is a no-op otherwise.
  const coarseOffset = getCentralOffsetMinutes(asIfUtc);
  const candidate = new Date(asIfUtc.getTime() - coarseOffset * 60_000);
  const offsetMinutes = getCentralOffsetMinutes(candidate);
  // Subtract that offset (Central is negative — subtracting a negative number
  // adds to the timestamp, shifting forward into UTC).
  const trueUtc = new Date(asIfUtc.getTime() - offsetMinutes * 60_000);
  return trueUtc.toISOString();
}

/**
 * Offset in minutes for `America/Chicago` at the given moment.
 * Returns -360 (CST) or -300 (CDT).
 */
export function getCentralOffsetMinutes(at: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIMEZONE,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(at);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-6";
  const match = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return -360;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3] ?? "0", 10));
}

/**
 * Format a date/time in Central. Convenience wrappers for the most common
 * formats; pass extra Intl options via `extra`.
 */
function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatCentralDate(
  input: Date | string,
  extra: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }
): string {
  return toDate(input).toLocaleDateString("en-US", { ...extra, timeZone: CENTRAL_TIMEZONE });
}

export function formatCentralTime(
  input: Date | string,
  extra: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
): string {
  return toDate(input).toLocaleTimeString("en-US", { ...extra, timeZone: CENTRAL_TIMEZONE });
}

export function formatCentralDateTime(
  input: Date | string,
  extra: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
): string {
  return toDate(input).toLocaleString("en-US", { ...extra, timeZone: CENTRAL_TIMEZONE });
}
