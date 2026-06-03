// Read-only 4-week glanceable view of what clients see at /book. Renders
// the same `availability_slots` rows the public booking calendar queries,
// laid out as a Mon-through-Sun grid per week.

import { createClient } from "@/lib/supabase/server";
import { CalendarDays } from "lucide-react";

const PREVIEW_WEEKS = 4;

interface SlotRow {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  service_type: string | null;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTimeShort(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "p" : "a";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return minute === "00" ? `${displayHour}${ampm}` : `${displayHour}:${minute}${ampm}`;
}

/** Sunday of the week containing `dateStr`. */
function sundayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function UpcomingAvailabilityGrid() {
  const supabase = await createClient();
  const today = todayLocal();
  const windowEnd = addDays(today, PREVIEW_WEEKS * 7);

  const { data: rows } = await supabase
    .from("availability_slots")
    .select("id, slot_date, start_time, end_time, is_booked, service_type")
    .gte("slot_date", today)
    .lt("slot_date", windowEnd)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  const slots = (rows ?? []) as SlotRow[];

  // Build a Sun..Sat × N-weeks grid starting from this week's Sunday.
  const firstSunday = sundayOf(today);
  const weeks: { weekStart: string; days: string[] }[] = [];
  for (let w = 0; w < PREVIEW_WEEKS; w += 1) {
    const weekStart = addDays(firstSunday, w * 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    weeks.push({ weekStart, days });
  }

  // Index slots by date for O(1) lookup.
  const slotsByDate = new Map<string, SlotRow[]>();
  for (const slot of slots) {
    const bucket = slotsByDate.get(slot.slot_date) ?? [];
    bucket.push(slot);
    slotsByDate.set(slot.slot_date, bucket);
  }

  const openCount = slots.filter((s) => !s.is_booked).length;
  const bookedCount = slots.filter((s) => s.is_booked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-brand-100 border border-brand-200" />
          {openCount} open
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-neutral-100 border border-neutral-200" />
          {bookedCount} booked
        </span>
      </div>

      <div className="space-y-4">
        {weeks.map(({ weekStart, days }) => (
          <div key={weekStart} className="space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
              Week of {new Date(`${weekStart}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((date, i) => {
                const dateSlots = slotsByDate.get(date) ?? [];
                const isPast = date < today;
                const dayDate = new Date(`${date}T00:00:00`);
                return (
                  <div
                    key={date}
                    className={`rounded-md border p-1.5 min-h-[64px] ${
                      isPast
                        ? "border-neutral-100 bg-neutral-50/50 opacity-50"
                        : dateSlots.length === 0
                        ? "border-neutral-100 bg-neutral-50/30"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
                      {DAY_LABELS[i]} {dayDate.getDate()}
                    </p>
                    <div className="space-y-0.5">
                      {dateSlots.slice(0, 6).map((slot) => (
                        <span
                          key={slot.id}
                          className={`block text-[10px] px-1 py-0.5 rounded leading-tight truncate ${
                            slot.is_booked
                              ? "bg-neutral-100 text-neutral-500 line-through"
                              : "bg-brand-100 text-brand-800"
                          }`}
                          title={`${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}${slot.service_type ? " · " + slot.service_type : ""}${slot.is_booked ? " · booked" : ""}`}
                        >
                          {formatTimeShort(slot.start_time)}
                        </span>
                      ))}
                      {dateSlots.length > 6 && (
                        <span className="block text-[10px] text-neutral-400">
                          +{dateSlots.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {openCount === 0 && bookedCount === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CalendarDays className="h-8 w-8 text-neutral-300 mb-2" />
          <p className="text-sm text-neutral-500">
            No slots in the next {PREVIEW_WEEKS} weeks. Add a weekly schedule above to get started.
          </p>
        </div>
      )}
    </div>
  );
}
