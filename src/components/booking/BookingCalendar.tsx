"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Import react-day-picker base styles and override with brand colors
import "react-day-picker/src/style.css";

interface BookingCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  availableDates: string[]; // "YYYY-MM-DD" strings
  onMonthChange?: (month: Date) => void;
}

export function BookingCalendar({
  selected,
  onSelect,
  availableDates,
  onMonthChange,
}: BookingCalendarProps) {
  const availableSet = React.useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  // A day is disabled if it's in the past OR not in the available set
  const isDisabled = React.useCallback(
    (date: Date): boolean => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return true;
      const key = date.toISOString().split("T")[0];
      return !availableSet.has(key);
    },
    [availableSet]
  );

  return (
    <div
      className={cn(
        // Override react-day-picker CSS variables with brand colors
        "[--rdp-accent-color:theme(colors.brand.600)]",
        "[--rdp-accent-background-color:theme(colors.brand.50)]",
        "[--rdp-today-color:theme(colors.brand.600)]",
        "[--rdp-day_button-border-radius:theme(borderRadius.lg)]",
        "[--rdp-day-height:2.75rem]",
        "[--rdp-day-width:2.75rem]",
        "[--rdp-day_button-height:2.5rem]",
        "[--rdp-day_button-width:2.5rem]",
        "w-full"
      )}
    >
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={isDisabled}
        onMonthChange={onMonthChange}
        fromDate={new Date()}
        showOutsideDays={false}
        components={{
          Chevron: ({ orientation }) =>
            orientation === "left" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            ),
        }}
        classNames={{
          root: "w-full",
          months: "w-full",
          month: "w-full",
          month_caption: "flex items-center justify-between px-1 mb-3",
          caption_label: "font-display font-semibold text-neutral-900",
          nav: "flex items-center gap-1",
          button_previous: "p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-900",
          button_next: "p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-900",
          weeks: "w-full",
          weekdays: "grid grid-cols-7 mb-1",
          weekday: "text-center text-xs font-medium text-neutral-400 py-1",
          week: "grid grid-cols-7",
          day: "flex items-center justify-center",
          day_button: cn(
            "w-10 h-10 rounded-lg text-sm font-medium transition-all",
            "hover:bg-brand-50 hover:text-brand-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          ),
          selected: "bg-brand-600 text-white rounded-lg hover:bg-brand-700",
          today: "text-brand-700 font-bold",
          disabled: "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-inherit",
          outside: "opacity-0 pointer-events-none",
        }}
      />
    </div>
  );
}
