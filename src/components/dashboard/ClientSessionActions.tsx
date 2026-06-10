"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarClock, X } from "lucide-react";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker, type TimeSlot } from "@/components/booking/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import { clientRescheduleSession, clientCancelSession } from "@/app/actions/sessions";

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ClientSessionActions({ bookingId }: { bookingId: string }) {
  const [mode, setMode] = React.useState<"idle" | "reschedule">("idle");
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);

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
    if (mode === "reschedule") loadMonth(new Date());
  }, [mode, loadMonth]);

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

  async function confirmReschedule() {
    const slot = slots.find((s) => s.id === selectedSlotId);
    if (!selectedDate || !slot) {
      toast.error("Pick a new date and time.");
      return;
    }
    const time = slot.start_time.slice(0, 5); // "HH:MM"
    setBusy(true);
    const res = await clientRescheduleSession(bookingId, toYmd(selectedDate), time);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session rescheduled. Check your email for the new details.");
    setMode("idle");
    location.reload();
  }

  async function cancel() {
    if (!confirm("Cancel this session? You can rebook anytime more than 24 hours out.")) return;
    setBusy(true);
    const res = await clientCancelSession(bookingId);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session cancelled.");
    location.reload();
  }

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMode("reschedule")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          <CalendarClock className="h-4 w-4" /> Reschedule
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-red-600 disabled:opacity-40"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">Pick a new date and time (Central).</p>
      <BookingCalendar
        selected={selectedDate}
        onSelect={onSelectDate}
        availableDates={availableDates}
        onMonthChange={loadMonth}
      />
      {selectedDate && (
        <TimeSlotPicker slots={slots} selectedSlotId={selectedSlotId} onSelect={setSelectedSlotId} loading={slotsLoading} />
      )}
      <div className="flex items-center gap-3">
        <Button onClick={confirmReschedule} disabled={busy || !selectedSlotId}>
          {busy ? "Rescheduling…" : "Confirm new time"}
        </Button>
        <button type="button" onClick={() => setMode("idle")} className="text-xs text-neutral-500 hover:text-neutral-700">
          Back
        </button>
      </div>
    </div>
  );
}
