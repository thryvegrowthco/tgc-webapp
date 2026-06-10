"use client";

import * as React from "react";
import { toast } from "sonner";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker, type TimeSlot } from "@/components/booking/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import { redeemPackageCredit } from "@/app/actions/packages";

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PackageRedeemClient({ packageId }: { packageId: string }) {
  const [open, setOpen] = React.useState(false);
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);

  const loadMonth = React.useCallback(async (month: Date) => {
    try {
      const res = await fetch(`/api/booking/slots?month=${ymKey(month)}`);
      const json = await res.json();
      setAvailableDates(json.availableDates ?? []);
    } catch {
      setAvailableDates([]);
    }
  }, []);

  React.useEffect(() => {
    if (open) loadMonth(new Date());
  }, [open, loadMonth]);

  async function onSelectDate(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedSlotId(undefined);
    setSlots([]);
    if (!date) return;
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/booking/slots?date=${toYmd(date)}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    }
    setSlotsLoading(false);
  }

  async function confirm() {
    if (!selectedSlotId) {
      toast.error("Pick a time.");
      return;
    }
    setSubmitting(true);
    const res = await redeemPackageCredit({ packageId, slotId: selectedSlotId });
    // Success redirects server-side; only an error returns here.
    if (res?.error) {
      setSubmitting(false);
      toast.error(res.error);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mt-1">
        Book your next session
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
      <p className="text-xs text-neutral-500">Pick a date, then a time (Central). This uses one session from your package — no payment.</p>
      <BookingCalendar
        selected={selectedDate}
        onSelect={onSelectDate}
        availableDates={availableDates}
        onMonthChange={loadMonth}
      />
      {selectedDate && (
        <TimeSlotPicker
          slots={slots}
          selectedSlotId={selectedSlotId}
          onSelect={setSelectedSlotId}
          loading={slotsLoading}
        />
      )}
      <div className="flex items-center gap-3">
        <Button onClick={confirm} disabled={submitting || !selectedSlotId}>
          {submitting ? "Booking…" : "Confirm session"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
