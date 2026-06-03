// Pattern -> slots materialization.
//
// Single source of truth for "patterns + blackouts → concrete
// availability_slots rows." Used both by:
//   - the daily /api/cron/extend-availability route (rolling 8-week window)
//   - the upsertPattern / removeBlackout server actions (immediate rebuild)
//
// Idempotent by design: every insert is an upsert on the existing
// UNIQUE(slot_date, start_time) constraint, so re-running is safe and
// already-booked or one-off slots are never disturbed.

import { createServiceClient } from "@/lib/supabase/service";
import {
  splitBlock,
  toDateOnly,
  addDays,
  dayOfWeek,
  isBlackedOut,
} from "@/lib/availability/time";
import type {
  AvailabilityBlackout,
  AvailabilityPattern,
} from "@/types/database";

export const DEFAULT_ROLLING_WEEKS = 8;

export interface MaterializeResult {
  created: number;
  scanned: number;
  windowStart: string;
  windowEnd: string;
}

interface MaterializeOptions {
  /** Optional override for tests / cron `?now=` parameter. Defaults to today. */
  now?: Date;
  /** How many weeks ahead to materialize. Default 8. */
  weeks?: number;
}

/**
 * Generates slots for every active pattern across the rolling window and
 * upserts them into `availability_slots`. Returns counts for telemetry.
 */
export async function materializePatterns(
  options: MaterializeOptions = {}
): Promise<MaterializeResult> {
  const supabase = createServiceClient();
  const now = options.now ?? new Date();
  const weeks = options.weeks ?? DEFAULT_ROLLING_WEEKS;

  const windowStart = toDateOnly(now);
  const windowEnd = addDays(windowStart, weeks * 7 - 1);

  // Pull active patterns whose effective range overlaps the window.
  const { data: patternsRaw } = await supabase
    .from("availability_patterns")
    .select(
      "id, day_of_week, start_time, end_time, slot_duration_minutes, service_type, effective_from, effective_until, is_active"
    )
    .eq("is_active", true)
    .lte("effective_from", windowEnd);
  const patterns = ((patternsRaw ?? []) as AvailabilityPattern[]).filter(
    (p) => !p.effective_until || p.effective_until >= windowStart
  );

  // Pull blackouts that overlap the window.
  const { data: blackoutsRaw } = await supabase
    .from("availability_blackouts")
    .select("start_date, end_date")
    .gte("end_date", windowStart)
    .lte("start_date", windowEnd);
  const blackouts = (blackoutsRaw ?? []) as Pick<
    AvailabilityBlackout,
    "start_date" | "end_date"
  >[];

  const rows = buildSlotRows({ patterns, blackouts, windowStart, windowEnd });
  if (rows.length === 0) {
    return { created: 0, scanned: 0, windowStart, windowEnd };
  }

  // ON CONFLICT (slot_date, start_time) DO NOTHING — leaves booked slots and
  // any preexisting one-off slots untouched. We don't get an exact "created"
  // count back from Supabase upserts; we count rows after de-duping against
  // a pre-fetch of existing slot keys instead.
  const slotKeys = rows.map((r) => `${r.slot_date}|${r.start_time}`);
  const { data: existing } = await supabase
    .from("availability_slots")
    .select("slot_date, start_time")
    .gte("slot_date", windowStart)
    .lte("slot_date", windowEnd);

  const existingSet = new Set(
    (existing ?? []).map((s) => `${s.slot_date}|${s.start_time}`)
  );
  const toInsert = rows.filter((r) => !existingSet.has(`${r.slot_date}|${r.start_time}`));
  if (toInsert.length === 0) {
    return { created: 0, scanned: slotKeys.length, windowStart, windowEnd };
  }

  const { error } = await supabase
    .from("availability_slots")
    .upsert(toInsert, {
      onConflict: "slot_date,start_time",
      ignoreDuplicates: true,
    });

  if (error) {
    // Surface the count of attempted inserts even on partial failure.
    return { created: 0, scanned: slotKeys.length, windowStart, windowEnd };
  }
  return { created: toInsert.length, scanned: slotKeys.length, windowStart, windowEnd };
}

/**
 * Rebuilds forward for a single pattern (or all patterns if `patternId` is
 * null). Deletes future unbooked slots tied to the pattern, then re-runs
 * materialization. Wrapped in best-effort error handling — on partial failure
 * the function still returns counts of work done.
 */
export async function rebuildForward(args: {
  patternId?: string | null;
  fromDate?: string;
  weeks?: number;
}): Promise<{ deleted: number; created: number }> {
  const supabase = createServiceClient();
  const fromDate = args.fromDate ?? toDateOnly(new Date());
  const weeks = args.weeks ?? DEFAULT_ROLLING_WEEKS;
  const windowEnd = addDays(fromDate, weeks * 7 - 1);

  // Delete unbooked future slots tied to the pattern(s).
  let deleteQuery = supabase
    .from("availability_slots")
    .delete()
    .gte("slot_date", fromDate)
    .lte("slot_date", windowEnd)
    .eq("is_booked", false);

  if (args.patternId === null || args.patternId === undefined) {
    // Rebuild all pattern-derived slots in the window.
    deleteQuery = deleteQuery.not("pattern_id", "is", null);
  } else {
    deleteQuery = deleteQuery.eq("pattern_id", args.patternId);
  }

  const { data: deletedRows, error: deleteError } = await deleteQuery.select("id");
  const deleted = deleteError ? 0 : deletedRows?.length ?? 0;

  const result = await materializePatterns({ now: new Date(`${fromDate}T00:00:00`), weeks });
  return { deleted, created: result.created };
}

interface SlotRow {
  slot_date: string;
  start_time: string;
  end_time: string;
  service_type: string | null;
  pattern_id: string;
  is_booked: false;
}

interface BuildArgs {
  patterns: AvailabilityPattern[];
  blackouts: Pick<AvailabilityBlackout, "start_date" | "end_date">[];
  windowStart: string;
  windowEnd: string;
}

export function buildSlotRows({
  patterns,
  blackouts,
  windowStart,
  windowEnd,
}: BuildArgs): SlotRow[] {
  if (patterns.length === 0) return [];

  // Pre-group patterns by day-of-week for cheap lookup as we walk dates.
  const byDow = new Map<number, AvailabilityPattern[]>();
  for (const p of patterns) {
    const bucket = byDow.get(p.day_of_week) ?? [];
    bucket.push(p);
    byDow.set(p.day_of_week, bucket);
  }

  const rows: SlotRow[] = [];
  let cursor = windowStart;
  while (cursor <= windowEnd) {
    if (!isBlackedOut(cursor, blackouts)) {
      const dow = dayOfWeek(cursor);
      const applicable = byDow.get(dow) ?? [];
      for (const pattern of applicable) {
        if (pattern.effective_from > cursor) continue;
        if (pattern.effective_until && pattern.effective_until < cursor) continue;
        const blocks = splitBlock(
          { startTime: pattern.start_time.slice(0, 5), endTime: pattern.end_time.slice(0, 5) },
          pattern.slot_duration_minutes
        );
        for (const block of blocks) {
          rows.push({
            slot_date: cursor,
            start_time: `${block.startTime}:00`,
            end_time: `${block.endTime}:00`,
            service_type: pattern.service_type,
            pattern_id: pattern.id,
            is_booked: false,
          });
        }
      }
    }
    cursor = addDays(cursor, 1);
  }

  return rows;
}
