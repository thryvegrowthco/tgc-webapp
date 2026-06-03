"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addBulkAvailabilitySlots } from "@/app/actions/booking";

const SERVICE_TYPES = [
  { value: "", label: "Any service" },
  { value: "Coaching", label: "Coaching" },
  { value: "Interview Prep", label: "Interview Prep" },
  { value: "Resume Materials", label: "Resume Materials" },
  { value: "HR Consulting", label: "HR Consulting" },
  { value: "Culture Engagement", label: "Culture Engagement" },
];

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const WEEKDAYS = new Set([1, 2, 3, 4, 5]);
const WEEKEND = new Set([0, 6]);
const ALL_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

type TimeBlock = { id: string; startTime: string; endTime: string };

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function newBlockId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function formatTime(time: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Walks forward from `startDate` for `weeks * 7` days and collects dates whose
// weekday is in `selectedDays`. Returns sorted YYYY-MM-DD strings.
function expandDates(startDate: string, selectedDays: Set<number>, weeks: number): string[] {
  if (!startDate || selectedDays.size === 0 || weeks <= 0) return [];
  const out: string[] = [];
  const base = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return [];
  const totalDays = weeks * 7;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    if (selectedDays.has(d.getDay())) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
  }
  return out;
}

interface ValidationResult {
  ok: boolean;
  error?: string;
  overlap?: boolean;
}

function validate(
  blocks: TimeBlock[],
  selectedDays: Set<number>,
  startDate: string
): ValidationResult {
  if (!startDate) return { ok: false, error: "Pick a start date." };
  if (startDate < todayLocal()) return { ok: false, error: "Start date can't be in the past." };
  if (selectedDays.size === 0) return { ok: false, error: "Pick at least one day of the week." };
  if (blocks.length === 0) return { ok: false, error: "Add at least one time block." };

  for (const b of blocks) {
    if (!b.startTime || !b.endTime) {
      return { ok: false, error: "Fill in all time blocks." };
    }
    if (b.endTime <= b.startTime) {
      return { ok: false, error: "End time must be after start time." };
    }
  }

  // Overlap check within the same day (sort by start, scan adjacent pairs).
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return { ok: false, error: "Time blocks overlap on the same day.", overlap: true };
    }
  }

  return { ok: true };
}

export function BulkSlotForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [startDate, setStartDate] = React.useState(todayLocal());
  const [selectedDays, setSelectedDays] = React.useState<Set<number>>(new Set(WEEKDAYS));
  const [recurring, setRecurring] = React.useState(false);
  const [weeks, setWeeks] = React.useState(4);
  const [timeBlocks, setTimeBlocks] = React.useState<TimeBlock[]>([
    { id: newBlockId(), startTime: "09:00", endTime: "10:00" },
  ]);
  const [serviceType, setServiceType] = React.useState("");

  const effectiveWeeks = recurring ? Math.max(1, Math.min(12, weeks)) : 1;

  const dates = React.useMemo(
    () => expandDates(startDate, selectedDays, effectiveWeeks),
    [startDate, selectedDays, effectiveWeeks]
  );

  const validation = validate(timeBlocks, selectedDays, startDate);
  const slotCount = dates.length * timeBlocks.length;

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function setDays(set: Set<number>) {
    setSelectedDays(new Set(set));
  }

  function addBlock() {
    setTimeBlocks((prev) => [
      ...prev,
      { id: newBlockId(), startTime: "13:00", endTime: "14:00" },
    ]);
  }

  function removeBlock(id: string) {
    setTimeBlocks((prev) => (prev.length === 1 ? prev : prev.filter((b) => b.id !== id)));
  }

  function updateBlock(id: string, patch: Partial<Pick<TimeBlock, "startTime" | "endTime">>) {
    setTimeBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function resetAfterSubmit() {
    setSelectedDays(new Set(WEEKDAYS));
    setTimeBlocks([{ id: newBlockId(), startTime: "09:00", endTime: "10:00" }]);
    setRecurring(false);
    setWeeks(4);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation.ok || slotCount === 0) {
      if (validation.error) toast.error(validation.error);
      return;
    }

    setLoading(true);
    const result = await addBulkAvailabilitySlots({
      dates,
      timeBlocks: timeBlocks.map(({ startTime, endTime }) => ({ startTime, endTime })),
      serviceType: serviceType || null,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const created = result.created ?? 0;
    const skipped = result.skipped ?? 0;
    if (created === 0 && skipped > 0) {
      toast.success(`No new slots created — all ${skipped} already existed.`);
    } else if (skipped > 0) {
      toast.success(`Created ${created} slot${created === 1 ? "" : "s"} (${skipped} already existed).`);
    } else {
      toast.success(`Created ${created} slot${created === 1 ? "" : "s"}.`);
    }
    resetAfterSubmit();
    router.refresh();
  }

  // Preview rendering — group dates and show per-date time blocks.
  const sortedBlocksForPreview = React.useMemo(
    () => [...timeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timeBlocks]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Days of week */}
      <div className="space-y-2">
        <Label>Days of the week <span className="text-red-500">*</span></Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = selectedDays.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                aria-pressed={active}
                className={
                  "h-10 min-w-[3.25rem] rounded-md px-3 text-sm font-medium border transition-colors " +
                  (active
                    ? "bg-brand-500 text-white border-brand-500 hover:bg-brand-600"
                    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400")
                }
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <button type="button" onClick={() => setDays(WEEKDAYS)} className="text-brand-600 hover:underline">
            Weekdays
          </button>
          <button type="button" onClick={() => setDays(WEEKEND)} className="text-brand-600 hover:underline">
            Weekends
          </button>
          <button type="button" onClick={() => setDays(ALL_DAYS)} className="text-brand-600 hover:underline">
            All days
          </button>
          <button
            type="button"
            onClick={() => setDays(new Set())}
            className="text-neutral-400 hover:text-neutral-600 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Start date + recurring */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="bulk-startDate">Start date <span className="text-red-500">*</span></Label>
          <Input
            id="bulk-startDate"
            type="date"
            value={startDate}
            min={todayLocal()}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Repeats</Label>
          <div className="flex items-center gap-4 h-10">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-neutral-700">Recurring weekly</span>
            </label>
            {recurring && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <span>for</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={weeks}
                  onChange={(e) => setWeeks(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                  className="w-20 h-9"
                />
                <span>week{weeks === 1 ? "" : "s"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time blocks */}
      <div className="space-y-2">
        <Label>Time blocks <span className="text-red-500">*</span></Label>
        <div className="space-y-2">
          {timeBlocks.map((block, idx) => (
            <div key={block.id} className="flex items-center gap-2">
              <Input
                type="time"
                value={block.startTime}
                onChange={(e) => updateBlock(block.id, { startTime: e.target.value })}
                aria-label={`Start time block ${idx + 1}`}
                className="w-36"
              />
              <span className="text-neutral-400 text-sm">to</span>
              <Input
                type="time"
                value={block.endTime}
                onChange={(e) => updateBlock(block.id, { endTime: e.target.value })}
                aria-label={`End time block ${idx + 1}`}
                className="w-36"
              />
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                disabled={timeBlocks.length === 1}
                aria-label="Remove time block"
                className="ml-1 p-1.5 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:hover:text-neutral-300 disabled:hover:bg-transparent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBlock}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline pt-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add time block
        </button>
      </div>

      {/* Service type */}
      <div className="space-y-1.5 max-w-sm">
        <Label htmlFor="bulk-serviceType">Service (optional)</Label>
        <select
          id="bulk-serviceType"
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          className={SELECT_CLASS}
        >
          {SERVICE_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-900">
              {validation.ok && slotCount > 0
                ? `Will create ${slotCount} slot${slotCount === 1 ? "" : "s"}`
                : "Preview"}
            </p>
          </div>
          {validation.ok && dates.length > 0 && (
            <p className="text-xs text-neutral-500">
              {dates.length} date{dates.length === 1 ? "" : "s"} × {timeBlocks.length} block
              {timeBlocks.length === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {!validation.ok ? (
          <p className="text-xs text-neutral-500">{validation.error}</p>
        ) : dates.length === 0 ? (
          <p className="text-xs text-neutral-500">No matching dates in the selected range.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto pr-1">
            <ul className="divide-y divide-neutral-200">
              {dates.map((date) => (
                <li key={date} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 w-24 flex-shrink-0">
                    {formatDate(date)}
                  </span>
                  <span className="text-xs text-neutral-700">
                    {sortedBlocksForPreview
                      .map((b) => `${formatTime(b.startTime)}–${formatTime(b.endTime)}`)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || !validation.ok || slotCount === 0}>
          {loading
            ? "Creating…"
            : slotCount > 0
              ? `Create ${slotCount} slot${slotCount === 1 ? "" : "s"}`
              : "Create slots"}
        </Button>
        {!validation.ok && validation.error && (
          <span className="text-xs text-red-600">{validation.error}</span>
        )}
      </div>
    </form>
  );
}
