"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar } from "lucide-react";
import { deleteAvailabilitySlotsBulk } from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  service_type: string | null;
}

interface SlotListProps {
  slots: Slot[];
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

export function SlotList({ slots }: SlotListProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (slots.length === 0) {
    return <EmptyState icon={Calendar} title="No open slots." description="Add one above to make it available for booking." />;
  }

  // Group by date — slots already arrive sorted by slot_date asc, start_time asc.
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = slot.slot_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleDay(daySlots: Slot[]) {
    const allSelected = daySlots.every((s) => selected.has(s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        daySlots.forEach((s) => next.delete(s.id));
      } else {
        daySlots.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(slots.map((s) => s.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleConfirmDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = [...selected];
    const result = await deleteAvailabilitySlotsBulk(ids);
    setDeleting(false);
    setConfirmOpen(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const deleted = result.deleted ?? 0;
    const skipped = result.skipped ?? 0;
    if (skipped > 0) {
      toast.success(`Deleted ${deleted} slot${deleted === 1 ? "" : "s"} (${skipped} already booked — skipped).`);
    } else {
      toast.success(`Deleted ${deleted} slot${deleted === 1 ? "" : "s"}.`);
    }
    setSelected(new Set());
    router.refresh();
  }

  const allSelected = slots.every((s) => selected.has(s.id));

  return (
    <>
      {/* Selection action bar */}
      {selected.size > 0 ? (
        <div className="px-6 py-3 bg-brand-50 border-b border-brand-200 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-brand-900">
            {selected.size} slot{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-brand-700 hover:underline"
            >
              Clear selection
            </button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-6 py-2 border-b border-neutral-100 flex items-center justify-end">
          <button
            type="button"
            onClick={allSelected ? clearSelection : selectAll}
            className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        </div>
      )}

      <div className="divide-y divide-neutral-100">
        {Object.entries(grouped).map(([date, daySlots]) => {
          const d = new Date(`${date}T00:00:00`);
          const dateLabel = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          const dayFullySelected = daySlots.every((s) => selected.has(s.id));
          const daySomeSelected = !dayFullySelected && daySlots.some((s) => selected.has(s.id));

          return (
            <div key={date} className="px-6 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  {dateLabel}
                </p>
                <button
                  type="button"
                  onClick={() => toggleDay(daySlots)}
                  className="text-xs text-neutral-400 hover:text-brand-600 hover:underline"
                >
                  {dayFullySelected ? "Deselect day" : daySomeSelected ? "Select rest of day" : "Select day"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const isSelected = selected.has(slot.id);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => toggle(slot.id)}
                      aria-pressed={isSelected}
                      className={
                        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border transition-colors cursor-pointer " +
                        (isSelected
                          ? "border-brand-500 ring-1 ring-brand-500 bg-brand-50 text-brand-900"
                          : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100")
                      }
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 flex-shrink-0" />}
                      <span className="font-medium">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </span>
                      {slot.service_type && (
                        <span
                          className={
                            "text-xs " + (isSelected ? "text-brand-700/70" : "text-neutral-400")
                          }
                        >
                          {slot.service_type}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => { if (!deleting) setConfirmOpen(open); }}
        title={`Delete ${selected.size} slot${selected.size === 1 ? "" : "s"}`}
        description="These availability slots will be removed permanently. Any that have already been booked will be skipped automatically."
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
