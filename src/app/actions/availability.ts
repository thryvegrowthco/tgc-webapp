"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rebuildForward, materializePatterns } from "@/lib/availability/generate";
import { isValidHHMM, toDateOnly, addDays } from "@/lib/availability/time";
import type { AvailabilityPattern, AvailabilityBlackout } from "@/types/database";

async function requireAdmin(): Promise<{ ok: true; userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role: string } | null)?.role !== "admin") return { error: "Admins only." };
  return { ok: true, userId: user.id };
}

export interface PatternInput {
  id?: string;                      // present = update; absent = create
  dayOfWeek: number;                // 0..6
  startTime: string;                // HH:MM
  endTime: string;                  // HH:MM
  slotDurationMinutes: number | null;
  serviceType: string | null;
  effectiveFrom?: string | null;    // YYYY-MM-DD; null = today
  effectiveUntil?: string | null;   // YYYY-MM-DD; null = forever
  isActive?: boolean;
}

export interface PatternResult {
  error?: string;
  pattern?: AvailabilityPattern;
  rebuilt?: { deleted: number; created: number };
}

function validatePattern(input: PatternInput): string | null {
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) return "Day of week must be 0–6.";
  if (!isValidHHMM(input.startTime)) return "Start time must be HH:MM.";
  if (!isValidHHMM(input.endTime)) return "End time must be HH:MM.";
  if (input.endTime <= input.startTime) return "End time must be after start time.";
  if (input.slotDurationMinutes !== null && input.slotDurationMinutes <= 0) {
    return "Slot duration must be positive.";
  }
  return null;
}

export async function upsertPattern(input: PatternInput): Promise<PatternResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const validationError = validatePattern(input);
  if (validationError) return { error: validationError };

  const service = createServiceClient();
  const today = toDateOnly(new Date());

  const payload = {
    day_of_week: input.dayOfWeek,
    start_time: `${input.startTime}:00`,
    end_time: `${input.endTime}:00`,
    slot_duration_minutes: input.slotDurationMinutes,
    service_type: input.serviceType,
    effective_from: input.effectiveFrom ?? today,
    effective_until: input.effectiveUntil ?? null,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  let pattern: AvailabilityPattern | null = null;

  if (input.id) {
    const { data, error } = await service
      .from("availability_patterns")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single();
    if (error) return { error: error.message };
    pattern = data as AvailabilityPattern;
  } else {
    const { data, error } = await service
      .from("availability_patterns")
      .insert(payload)
      .select()
      .single();
    if (error) return { error: error.message };
    pattern = data as AvailabilityPattern;
  }

  // Rebuild forward for this pattern so the change is visible immediately.
  const rebuilt = await rebuildForward({ patternId: pattern.id, fromDate: today });

  revalidatePath("/admin/bookings");
  return { pattern, rebuilt };
}

export async function deletePattern(id: string): Promise<{ error?: string; deleted?: number }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const today = toDateOnly(new Date());

  // Soft-deactivate so we keep history; rebuild-forward removes the
  // pattern's future unbooked slots.
  const { error: updateError } = await service
    .from("availability_patterns")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  const { data: deletedRows } = await service
    .from("availability_slots")
    .delete()
    .gte("slot_date", today)
    .eq("is_booked", false)
    .eq("pattern_id", id)
    .select("id");

  revalidatePath("/admin/bookings");
  return { deleted: deletedRows?.length ?? 0 };
}

export async function togglePatternActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string; rebuilt?: { deleted: number; created: number } }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const today = toDateOnly(new Date());

  const { error } = await service
    .from("availability_patterns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  const rebuilt = await rebuildForward({ patternId: id, fromDate: today });
  revalidatePath("/admin/bookings");
  return { rebuilt };
}

export interface BlackoutInput {
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface BlackoutResult {
  error?: string;
  blackout?: AvailabilityBlackout;
  unbookedRemoved?: number;
  bookedInRange?: number;
}

export async function addBlackout(input: BlackoutInput): Promise<BlackoutResult> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  if (!input.startDate || !input.endDate) return { error: "Pick a date range." };
  if (input.endDate < input.startDate) return { error: "End date must be on or after start date." };

  const service = createServiceClient();
  const { data, error } = await service
    .from("availability_blackouts")
    .insert({
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason ?? null,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  // Remove unbooked future slots inside the blackout that came from any pattern.
  const { data: removed } = await service
    .from("availability_slots")
    .delete()
    .gte("slot_date", input.startDate)
    .lte("slot_date", input.endDate)
    .eq("is_booked", false)
    .not("pattern_id", "is", null)
    .select("id");

  // Warn if there are already booked slots in this window — Rachel will need
  // to reach out to those clients.
  const { count: bookedCount } = await service
    .from("availability_slots")
    .select("id", { count: "exact", head: true })
    .gte("slot_date", input.startDate)
    .lte("slot_date", input.endDate)
    .eq("is_booked", true);

  revalidatePath("/admin/bookings");
  return {
    blackout: data as AvailabilityBlackout,
    unbookedRemoved: removed?.length ?? 0,
    bookedInRange: bookedCount ?? 0,
  };
}

export async function removeBlackout(id: string): Promise<{ error?: string; rebuilt?: { deleted: number; created: number } }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const service = createServiceClient();
  const { data: row } = await service
    .from("availability_blackouts")
    .select("start_date, end_date")
    .eq("id", id)
    .maybeSingle();

  const { error } = await service.from("availability_blackouts").delete().eq("id", id);
  if (error) return { error: error.message };

  // Rebuild forward only across the freed range so we don't churn the whole
  // 8-week window.
  const today = toDateOnly(new Date());
  const from = row && row.start_date > today ? row.start_date : today;
  const rebuilt = await rebuildForward({ patternId: null, fromDate: from });

  revalidatePath("/admin/bookings");
  return { rebuilt };
}

/** Read-only snapshot used by the page server component on every load. */
export async function getScheduleSnapshot(): Promise<{
  patterns: AvailabilityPattern[];
  blackouts: AvailabilityBlackout[];
}> {
  const supabase = await createClient();
  const today = toDateOnly(new Date());
  const futureEnd = addDays(today, 180);

  const [{ data: patternsRaw }, { data: blackoutsRaw }] = await Promise.all([
    supabase
      .from("availability_patterns")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("availability_blackouts")
      .select("*")
      .gte("end_date", today)
      .lte("start_date", futureEnd)
      .order("start_date", { ascending: true }),
  ]);

  return {
    patterns: (patternsRaw ?? []) as AvailabilityPattern[],
    blackouts: (blackoutsRaw ?? []) as AvailabilityBlackout[],
  };
}

/** Admin-triggered manual extension (mirrors the cron). */
export async function extendNow(): Promise<{ error?: string; created?: number }> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const result = await materializePatterns();
  revalidatePath("/admin/bookings");
  return { created: result.created };
}
