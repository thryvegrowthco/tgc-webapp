"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addBlackout, removeBlackout } from "@/app/actions/availability";
import type { AvailabilityBlackout } from "@/types/database";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sunday of the week containing `dateStr`. */
function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start === end) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

interface BlackoutManagerProps {
  initialBlackouts: AvailabilityBlackout[];
}

export function BlackoutManager({ initialBlackouts }: BlackoutManagerProps) {
  const router = useRouter();
  const [blackouts, setBlackouts] = React.useState(initialBlackouts);
  const [showForm, setShowForm] = React.useState(false);
  const [startDate, setStartDate] = React.useState(todayLocal());
  const [endDate, setEndDate] = React.useState(todayLocal());
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  function applyQuickRange(kind: "this-week" | "next-week" | "this-friday") {
    const today = todayLocal();
    if (kind === "this-friday") {
      const todayDate = new Date(`${today}T00:00:00`);
      const friOffset = (5 - todayDate.getDay() + 7) % 7;
      const fri = addDays(today, friOffset);
      setStartDate(fri);
      setEndDate(fri);
      return;
    }
    if (kind === "this-week") {
      const sunday = startOfWeek(today);
      setStartDate(today < sunday ? today : today);
      setEndDate(addDays(sunday, 6));
      return;
    }
    if (kind === "next-week") {
      const sunday = startOfWeek(today);
      const nextSunday = addDays(sunday, 7);
      setStartDate(nextSunday);
      setEndDate(addDays(nextSunday, 6));
    }
  }

  async function handleAdd() {
    if (!startDate || !endDate) {
      toast.error("Pick a date range.");
      return;
    }
    setSaving(true);
    const result = await addBlackout({
      startDate,
      endDate,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (result.error || !result.blackout) {
      toast.error(result.error ?? "Couldn't save blackout.");
      return;
    }
    setBlackouts((prev) =>
      [...prev, result.blackout!].sort((a, b) => a.start_date.localeCompare(b.start_date))
    );
    setStartDate(todayLocal());
    setEndDate(todayLocal());
    setReason("");
    setShowForm(false);

    const removed = result.unbookedRemoved ?? 0;
    const booked = result.bookedInRange ?? 0;
    if (booked > 0) {
      toast.warning(
        `Blackout added — ${removed} unbooked slot${removed === 1 ? "" : "s"} removed. ${booked} session${booked === 1 ? "" : "s"} already booked in this range — reach out to those clients.`,
        { duration: 8000 }
      );
    } else if (removed > 0) {
      toast.success(`Blackout added — ${removed} unbooked slot${removed === 1 ? "" : "s"} removed.`);
    } else {
      toast.success("Blackout added.");
    }
    router.refresh();
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this blackout? Slots that were suppressed will be re-generated.")) return;
    const result = await removeBlackout(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setBlackouts((prev) => prev.filter((b) => b.id !== id));
    const created = result.rebuilt?.created ?? 0;
    if (created > 0) {
      toast.success(`Removed — ${created} slot${created === 1 ? "" : "s"} re-generated.`);
    } else {
      toast.success("Removed.");
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* List */}
      {blackouts.length === 0 ? (
        <p className="text-xs text-neutral-400 italic">No blackout dates set.</p>
      ) : (
        <ul className="space-y-2">
          {blackouts.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {formatRange(b.start_date, b.end_date)}
                </p>
                {b.reason && <p className="text-xs text-neutral-500">{b.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(b.id)}
                aria-label="Remove blackout"
                className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add */}
      {showForm ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-500">Quick:</span>
            <button
              type="button"
              onClick={() => applyQuickRange("this-friday")}
              className="text-brand-600 hover:underline"
            >
              This Friday
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange("this-week")}
              className="text-brand-600 hover:underline"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange("next-week")}
              className="text-brand-600 hover:underline"
            >
              Next week
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="blackout-start" className="text-xs">
                Start date
              </Label>
              <Input
                id="blackout-start"
                type="date"
                value={startDate}
                min={todayLocal()}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blackout-end" className="text-xs">
                End date
              </Label>
              <Input
                id="blackout-end"
                type="date"
                value={endDate}
                min={startDate || todayLocal()}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blackout-reason" className="text-xs">
              Reason (optional)
            </Label>
            <Input
              id="blackout-reason"
              value={reason}
              placeholder="Vacation, conference, holiday…"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleAdd} disabled={saving}>
              {saving ? "Adding…" : "Add blackout"}
            </Button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            Already-booked sessions stay on the calendar. You&apos;ll see a warning if any fall inside this range.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
        >
          <Plus className="h-3 w-3" /> Add blackout dates
        </button>
      )}
    </div>
  );
}
