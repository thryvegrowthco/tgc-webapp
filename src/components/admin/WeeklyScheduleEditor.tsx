"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertPattern, deletePattern } from "@/app/actions/availability";
import type { AvailabilityPattern } from "@/types/database";

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

const SERVICE_TYPES = [
  { value: "", label: "Any service" },
  { value: "Consultation", label: "Consultation" },
  { value: "Coaching", label: "Coaching" },
  { value: "Interview Prep", label: "Interview Prep" },
  { value: "Resume Materials", label: "Resume Materials" },
  { value: "HR Consulting", label: "HR Consulting" },
  { value: "Culture Engagement", label: "Culture Engagement" },
];

const DURATION_OPTIONS = [
  { value: "", label: "Whole block (1 slot)" },
  { value: "30", label: "30 min slots" },
  { value: "60", label: "60 min slots" },
  { value: "90", label: "90 min slots" },
];

// Default per-slot duration when a service type is chosen. Rachel can always
// override via the "Each slot" dropdown.
const SERVICE_DEFAULT_DURATION: Record<string, number | null> = {
  "Consultation": 30,
  "Coaching": 60,
  "Interview Prep": 60,
  "Resume Materials": null,         // resume work isn't scheduled in slots
  "HR Consulting": 60,
  "Culture Engagement": 90,
};

const SELECT_CLASS =
  "flex h-9 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1";

interface LocalRow {
  id?: string;        // present once persisted
  uiKey: string;      // stable React key
  dayOfWeek: number;
  startTime: string;  // HH:MM
  endTime: string;
  slotDurationMinutes: number | null;
  serviceType: string | null;
  dirty: boolean;
  saving: boolean;
}

let keyCounter = 0;
function newKey(): string {
  keyCounter += 1;
  return `new-${keyCounter}-${Date.now()}`;
}

function toLocal(pattern: AvailabilityPattern, existingUiKey?: string): LocalRow {
  return {
    id: pattern.id,
    uiKey: existingUiKey ?? pattern.id,
    dayOfWeek: pattern.day_of_week,
    startTime: pattern.start_time.slice(0, 5),
    endTime: pattern.end_time.slice(0, 5),
    slotDurationMinutes: pattern.slot_duration_minutes,
    serviceType: pattern.service_type,
    dirty: false,
    saving: false,
  };
}

interface WeeklyScheduleEditorProps {
  initialPatterns: AvailabilityPattern[];
}

export function WeeklyScheduleEditor({ initialPatterns }: WeeklyScheduleEditorProps) {
  const router = useRouter();
  const [rows, setRows] = React.useState<LocalRow[]>(
    () => initialPatterns.map((p) => toLocal(p))
  );

  const dirtyCount = React.useMemo(() => rows.filter((r) => r.dirty).length, [rows]);

  function patchRow(uiKey: string, patch: Partial<LocalRow>) {
    setRows((prev) =>
      prev.map((r) => (r.uiKey === uiKey ? { ...r, ...patch, dirty: true } : r))
    );
  }

  function addEmptyRow(dayOfWeek: number) {
    setRows((prev) => [
      ...prev,
      {
        uiKey: newKey(),
        dayOfWeek,
        startTime: "09:00",
        endTime: "10:00",
        slotDurationMinutes: null,
        serviceType: null,
        dirty: true,
        saving: false,
      },
    ]);
  }

  async function saveRow(uiKey: string): Promise<boolean> {
    const row = rows.find((r) => r.uiKey === uiKey);
    if (!row) return false;
    if (row.endTime <= row.startTime) {
      toast.error("End time must be after start time.");
      return false;
    }
    setRows((prev) => prev.map((r) => (r.uiKey === uiKey ? { ...r, saving: true } : r)));
    const result = await upsertPattern({
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      slotDurationMinutes: row.slotDurationMinutes,
      serviceType: row.serviceType,
    });
    if (result.error || !result.pattern) {
      toast.error(result.error ?? "Couldn't save.");
      setRows((prev) => prev.map((r) => (r.uiKey === uiKey ? { ...r, saving: false } : r)));
      return false;
    }
    setRows((prev) =>
      prev.map((r) => (r.uiKey === uiKey ? toLocal(result.pattern!, uiKey) : r))
    );
    const created = result.rebuilt?.created ?? 0;
    const deleted = result.rebuilt?.deleted ?? 0;
    if (created || deleted) {
      const parts: string[] = [];
      if (created) parts.push(`${created} slot${created === 1 ? "" : "s"} added`);
      if (deleted) parts.push(`${deleted} replaced`);
      toast.success(`Saved — ${parts.join(", ")}.`);
    } else {
      toast.success("Saved.");
    }
    return true;
  }

  async function deleteRow(uiKey: string) {
    const row = rows.find((r) => r.uiKey === uiKey);
    if (!row) return;
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.uiKey !== uiKey));
      return;
    }
    if (
      !confirm(
        "Delete this time block? Future unbooked slots will be removed. Already-booked sessions stay on the calendar."
      )
    ) {
      return;
    }
    const result = await deletePattern(row.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.uiKey !== uiKey));
    if (result.deleted) {
      toast.success(`Deleted — ${result.deleted} future slot${result.deleted === 1 ? "" : "s"} removed.`);
    } else {
      toast.success("Deleted.");
    }
    router.refresh();
  }

  function copyMondayToWeekdays() {
    const mondaySaved = rows.filter((r) => r.dayOfWeek === 1 && r.id);
    if (mondaySaved.length === 0) {
      toast.error("Save at least one Monday block first.");
      return;
    }
    if (!confirm(`Copy ${mondaySaved.length} Monday block${mondaySaved.length === 1 ? "" : "s"} to Tue–Fri? Click Save on each to apply.`)) {
      return;
    }
    setRows((prev) => [
      ...prev,
      ...[2, 3, 4, 5].flatMap((day) =>
        mondaySaved.map((r) => ({
          uiKey: newKey(),
          dayOfWeek: day,
          startTime: r.startTime,
          endTime: r.endTime,
          slotDurationMinutes: r.slotDurationMinutes,
          serviceType: r.serviceType,
          dirty: true,
          saving: false,
        }))
      ),
    ]);
    toast.message("Added Tue–Fri rows. Click Save on each (or Save all changes).");
  }

  async function saveAllDirty() {
    const dirty = rows.filter((r) => r.dirty);
    if (dirty.length === 0) {
      toast.message("No changes to save.");
      return;
    }
    let okCount = 0;
    for (const row of dirty) {
      const ok = await saveRow(row.uiKey);
      if (ok) okCount += 1;
    }
    if (okCount === dirty.length) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="text-brand-600 hover:underline"
        >
          Copy Monday to weekdays
        </button>
        <button
          type="button"
          onClick={saveAllDirty}
          className={`hover:underline ${dirtyCount > 0 ? "text-brand-700 font-medium" : "text-neutral-400"}`}
          disabled={dirtyCount === 0}
        >
          {dirtyCount > 0 ? `Save all changes (${dirtyCount})` : "All changes saved"}
        </button>
      </div>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const dayRows = rows.filter((r) => r.dayOfWeek === day.value);
          return (
            <div
              key={day.value}
              className="bg-white border border-neutral-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-900">{day.label}</h3>
                <button
                  type="button"
                  onClick={() => addEmptyRow(day.value)}
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add time block
                </button>
              </div>
              {dayRows.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No availability set.</p>
              ) : (
                <div className="space-y-2">
                  {dayRows.map((row) => (
                    <PatternRowEditor
                      key={row.uiKey}
                      row={row}
                      onChange={patchRow}
                      onSave={(uiKey) => void saveRow(uiKey).then((ok) => ok && router.refresh())}
                      onDelete={deleteRow}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PatternRowProps {
  row: LocalRow;
  onChange: (uiKey: string, patch: Partial<LocalRow>) => void;
  onSave: (uiKey: string) => void;
  onDelete: (uiKey: string) => void;
}

function PatternRowEditor({ row, onChange, onSave, onDelete }: PatternRowProps) {
  const isNew = !row.id;
  const canSave =
    row.startTime &&
    row.endTime &&
    row.endTime > row.startTime &&
    !row.saving;

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Start</Label>
          <Input
            type="time"
            value={row.startTime}
            onChange={(e) => onChange(row.uiKey, { startTime: e.target.value })}
            className="w-32 h-9"
          />
        </div>
        <span className="text-neutral-400 pb-2 text-xs">to</span>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">End</Label>
          <Input
            type="time"
            value={row.endTime}
            onChange={(e) => onChange(row.uiKey, { endTime: e.target.value })}
            className="w-32 h-9"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Service</Label>
          <select
            value={row.serviceType ?? ""}
            onChange={(e) => {
              const nextService = e.target.value || null;
              const patch: Partial<LocalRow> = { serviceType: nextService };
              // Auto-fill the per-slot duration only when the row hasn't
              // explicitly chosen one yet, OR when toggling away from a
              // service back to "Any service" leaves duration alone.
              if (nextService && SERVICE_DEFAULT_DURATION[nextService] !== undefined) {
                patch.slotDurationMinutes = SERVICE_DEFAULT_DURATION[nextService];
              }
              onChange(row.uiKey, patch);
            }}
            className={SELECT_CLASS}
          >
            {SERVICE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Each slot</Label>
          <select
            value={row.slotDurationMinutes?.toString() ?? ""}
            onChange={(e) =>
              onChange(row.uiKey, {
                slotDurationMinutes: e.target.value ? parseInt(e.target.value, 10) : null,
              })
            }
            className={SELECT_CLASS}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {row.dirty && !isNew && (
          <span className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">Unsaved</span>
        )}
        {!row.dirty && !isNew && (
          <span className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(row.uiKey)}
          disabled={!canSave || (!row.dirty && !isNew)}
        >
          {row.saving ? "Saving…" : "Save"}
        </Button>
        <button
          type="button"
          onClick={() => onDelete(row.uiKey)}
          aria-label="Delete time block"
          className="p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
