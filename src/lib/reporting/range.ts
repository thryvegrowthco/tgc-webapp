// Date-range presets for the analytics dashboard. Boundaries are computed in
// CENTRAL time (Rachel's business tz) via localCentralToUtcIso, NOT native-Date
// UTC math — the latter is off by up to ~6h at month boundaries on Vercel (UTC
// process tz). Each preset is a lower bound only (data can't be future-dated),
// so endIso is always null and the reports apply `.gte(col, startIso)`.

import { localCentralToUtcIso, CENTRAL_TIMEZONE } from "@/lib/time/central";

export type RangePreset = "this_month" | "last_90" | "this_year" | "all";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_90", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All-time" },
];

export interface ResolvedRange {
  preset: RangePreset;
  /** UTC ISO lower bound, or null for all-time. */
  startIso: string | null;
  /** Always null — there is no upper bound (no future-dated rows). */
  endIso: string | null;
  label: string;
}

/** The slice of a resolved range the report functions consume. */
export type ReportRange = Pick<ResolvedRange, "startIso" | "endIso">;

const DEFAULT_PRESET: RangePreset = "this_year";

/** "YYYY-MM-DD" for the given instant, read in Central time. */
function centralDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CENTRAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function resolveRange(preset: string | undefined | null): ResolvedRange {
  const p: RangePreset = RANGE_PRESETS.some((r) => r.value === preset)
    ? (preset as RangePreset)
    : DEFAULT_PRESET;
  const label = RANGE_PRESETS.find((r) => r.value === p)!.label;

  if (p === "all") {
    return { preset: p, startIso: null, endIso: null, label };
  }

  const now = new Date();
  const today = centralDateStr(now); // YYYY-MM-DD in Central
  let startDate: string;
  if (p === "this_month") {
    startDate = `${today.slice(0, 7)}-01`;
  } else if (p === "this_year") {
    startDate = `${today.slice(0, 4)}-01-01`;
  } else {
    // last_90: the Central calendar date 90 days ago.
    startDate = centralDateStr(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
  }

  return {
    preset: p,
    startIso: localCentralToUtcIso(startDate, "00:00:00"),
    endIso: null,
    label,
  };
}
