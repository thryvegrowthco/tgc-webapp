"use client";

import { cn } from "@/lib/utils";

export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  service_type: string | null;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlotId: string | undefined;
  onSelect: (slotId: string) => void;
  loading?: boolean;
}

function formatTime(time: string): string {
  // time is "HH:MM:SS" from Postgres
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${ampm}`;
}

export function TimeSlotPicker({
  slots,
  selectedSlotId,
  onSelect,
  loading = false,
}: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-neutral-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-2">
        No available times on this date. Please select another day.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelect(slot.id)}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-center",
              isSelected
                ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            {formatTime(slot.start_time)}
          </button>
        );
      })}
    </div>
  );
}
