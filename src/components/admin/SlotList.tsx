"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Calendar } from "lucide-react";
import { deleteAvailabilitySlot } from "@/app/actions/booking";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete);
    setPendingDelete(null);
    await deleteAvailabilitySlot(pendingDelete);
    setDeletingId(null);
    router.refresh();
  }

  if (slots.length === 0) {
    return <EmptyState icon={Calendar} title="No open slots." description="Add one above to make it available for booking." />;
  }

  // Group by date
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const key = slot.slot_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  return (
    <>
      <div className="divide-y divide-neutral-100">
        {Object.entries(grouped).map(([date, daySlots]) => {
          const d = new Date(`${date}T00:00:00`);
          const dateLabel = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });

          return (
            <div key={date} className="px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
                {dateLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="inline-flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm bg-neutral-50"
                  >
                    <span className="text-neutral-700 font-medium">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </span>
                    {slot.service_type && (
                      <span className="text-xs text-neutral-400">{slot.service_type}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(slot.id)}
                      disabled={deletingId === slot.id}
                      className="text-neutral-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      aria-label="Delete slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete slot"
        description="Remove this availability slot? Clients will no longer be able to book it."
        onConfirm={handleConfirmDelete}
        loading={deletingId !== null}
      />
    </>
  );
}
