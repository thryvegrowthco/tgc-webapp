// Time helpers shared by the schedule editor, the bulk-slot legacy form,
// and the materialization routine. Extracted from the original
// `src/components/admin/BulkSlotForm.tsx` so server-side code (cron, actions)
// can use the same primitives without pulling in a client component.

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidHHMM(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * Walks a time block in `minutes`-long steps. Leftover < minutes at the end
 * is dropped. If `minutes` is null or <= 0, returns the block unchanged as a
 * single-element array — i.e. "the whole block is one slot."
 */
export function splitBlock(
  block: { startTime: string; endTime: string },
  minutes: number | null
): Array<{ startTime: string; endTime: string }> {
  if (!isValidHHMM(block.startTime) || !isValidHHMM(block.endTime)) return [];
  if (minutes === null || minutes <= 0) return [{ ...block }];

  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  if (end <= start) return [];

  const out: Array<{ startTime: string; endTime: string }> = [];
  for (let cur = start; cur + minutes <= end; cur += minutes) {
    out.push({ startTime: minutesToTime(cur), endTime: minutesToTime(cur + minutes) });
  }
  return out;
}

/** Returns "YYYY-MM-DD" for the given Date interpreted in the runtime's local TZ. */
export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Adds `days` to a "YYYY-MM-DD" date and returns the same format. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

/** 0 = Sunday … 6 = Saturday for the given YYYY-MM-DD. */
export function dayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

/** True if `dateStr` falls inside any blackout (inclusive on both ends). */
export function isBlackedOut(
  dateStr: string,
  blackouts: Array<{ start_date: string; end_date: string }>
): boolean {
  for (const b of blackouts) {
    if (dateStr >= b.start_date && dateStr <= b.end_date) return true;
  }
  return false;
}
