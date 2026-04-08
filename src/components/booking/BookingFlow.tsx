"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { TimeSlotPicker, type TimeSlot } from "@/components/booking/TimeSlotPicker";
import { createBookingCheckoutSession } from "@/app/actions/booking";
import { BOOKABLE_SERVICES, SERVICE_SELECT_OPTIONS, type ServiceKey } from "@/lib/stripe/products";
import { cn } from "@/lib/utils";

type Step = "service" | "datetime" | "details" | "submitting";

const STEPS: { id: Step; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "datetime", label: "Date & Time" },
  { id: "details", label: "Your Info" },
];

export function BookingFlow() {
  const [step, setStep] = React.useState<Step>("service");
  const [serviceKey, setServiceKey] = React.useState<ServiceKey | "">("");
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [availableDates, setAvailableDates] = React.useState<string[]>([]);
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | undefined>();
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requiresSlot = serviceKey ? BOOKABLE_SERVICES.includes(serviceKey as ServiceKey) : true;
  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  // Fetch available dates when entering datetime step or month changes
  async function fetchAvailableDates(month: Date) {
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const res = await fetch(`/api/booking/slots?month=${key}`);
    const json = await res.json();
    setAvailableDates(json.availableDates ?? []);
  }

  // Fetch time slots when a date is selected
  async function handleDateSelect(date: Date | undefined) {
    setSelectedDate(date);
    setSelectedSlotId(undefined);
    setSlots([]);
    if (!date) return;
    setSlotsLoading(true);
    const dateStr = date.toISOString().split("T")[0];
    const res = await fetch(`/api/booking/slots?date=${dateStr}`);
    const json = await res.json();
    setSlots(json.slots ?? []);
    setSlotsLoading(false);
  }

  function handleServiceContinue() {
    if (!serviceKey) return;
    if (requiresSlot) {
      fetchAvailableDates(new Date());
      setStep("datetime");
    } else {
      setStep("details");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStep("submitting");

    const form = e.currentTarget;
    const result = await createBookingCheckoutSession({
      serviceKey: serviceKey as ServiceKey,
      slotId: selectedSlotId ?? null,
      firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value,
      lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
    });

    if (result?.error) {
      setError(result.error);
      setStep("details");
    }
    // On success, the server action redirects to Stripe — no further action needed
  }

  return (
    <div>
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const done = i < currentStepIndex;
          const active = s.id === step;
          if (!requiresSlot && s.id === "datetime") return null;
          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    done ? "bg-brand-600 text-white"
                    : active ? "bg-brand-600 text-white ring-4 ring-brand-100"
                    : "bg-neutral-200 text-neutral-500"
                  )}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={cn("text-sm font-medium hidden sm:block", active ? "text-brand-700" : "text-neutral-400")}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && !(!requiresSlot && STEPS[i + 1]?.id === "datetime") && (
                <ChevronRight className="h-4 w-4 text-neutral-300 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Service selection */}
      {step === "service" && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">
              What can I help you with?
            </h2>
            <p className="text-sm text-neutral-500">Select the service you&apos;re interested in.</p>
          </div>

          <div className="space-y-2">
            {SERVICE_SELECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setServiceKey(opt.value as ServiceKey)}
                className={cn(
                  "w-full text-left rounded-xl border px-4 py-3.5 text-sm transition-all",
                  serviceKey === opt.value
                    ? "border-brand-500 bg-brand-50 text-brand-800 font-medium"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-200 hover:bg-neutral-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!serviceKey}
            onClick={handleServiceContinue}
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Date & Time (only for bookable services) */}
      {step === "datetime" && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">
              Pick a date and time
            </h2>
            <p className="text-sm text-neutral-500">Available slots are highlighted.</p>
          </div>

          <BookingCalendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            availableDates={availableDates}
            onMonthChange={fetchAvailableDates}
          />

          {selectedDate && (
            <div>
              <p className="text-sm font-semibold text-neutral-700 mb-3">
                Available times for{" "}
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}:
              </p>
              <TimeSlotPicker
                slots={slots}
                selectedSlotId={selectedSlotId}
                onSelect={setSelectedSlotId}
                loading={slotsLoading}
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" className="flex-1" onClick={() => setStep("service")}>
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={!selectedDate || !selectedSlotId}
              onClick={() => setStep("details")}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Contact details */}
      {step === "details" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-900 mb-1">
              Your information
            </h2>
            <p className="text-sm text-neutral-500">Almost done. Just a few details.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
              <Input id="firstName" name="firstName" placeholder="Jane" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name <span className="text-red-500">*</span></Label>
              <Input id="lastName" name="lastName" placeholder="Smith" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone <span className="text-neutral-400 font-normal text-xs">(optional)</span></Label>
            <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">What&apos;s on your mind? <span className="text-neutral-400 font-normal text-xs">(optional)</span></Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Share any context about your situation or goals. Helps me prepare for our conversation."
              className="min-h-[100px]"
            />
          </div>

          {/* Summary */}
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 text-sm space-y-1.5">
            <p className="font-semibold text-neutral-800 mb-2">Booking Summary</p>
            <div className="flex justify-between">
              <span className="text-neutral-500">Service</span>
              <span className="font-medium text-neutral-800 text-right max-w-[60%]">
                {SERVICE_SELECT_OPTIONS.find((o) => o.value === serviceKey)?.label.split("(")[0].trim()}
              </span>
            </div>
            {selectedDate && selectedSlotId && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time</span>
                <span className="font-medium text-neutral-800">
                  {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  {slots.find((s) => s.id === selectedSlotId)?.start_time.slice(0, 5)}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep(requiresSlot ? "datetime" : "service")}
            >
              Back
            </Button>
            <Button type="submit" size="lg" className="flex-1">
              Proceed to Payment
            </Button>
          </div>

          <p className="text-xs text-center text-neutral-400">
            Secure checkout via Stripe. You&apos;ll be redirected to complete payment.
          </p>
        </form>
      )}

      {/* Submitting state */}
      {step === "submitting" && (
        <div className="py-12 text-center">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-neutral-600">Preparing your checkout…</p>
        </div>
      )}
    </div>
  );
}
