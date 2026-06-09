"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SERVICES, SERVICE_SELECT_OPTIONS, type ServiceKey } from "@/lib/stripe/products";
import { localCentralToUtcIso } from "@/lib/time/central";
import { formatDuration, type LocationType } from "@/lib/booking/display";
import {
  createBookingInvitation,
  type InvitationOptionInput,
} from "@/app/actions/booking-invitations";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2";

const LOCATION_OPTIONS: { value: LocationType; label: string; placeholder: string }[] = [
  { value: "google_meet", label: "Google Meet", placeholder: "Auto-generated Meet link" },
  { value: "phone", label: "Phone Call", placeholder: "Phone number to call" },
  { value: "in_person", label: "In Person", placeholder: "Address or location" },
  { value: "custom", label: "Custom", placeholder: "Custom instructions" },
];

type OptionRow = { id: string; date: string; time: string };

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface BookingInvitationFormProps {
  prefillClientId?: string | null;
  prefillClientEmail?: string | null;
  prefillClientName?: string | null;
}

export function BookingInvitationForm({
  prefillClientId,
  prefillClientEmail,
  prefillClientName,
}: BookingInvitationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [clientEmail, setClientEmail] = React.useState(prefillClientEmail ?? "");
  const [clientName, setClientName] = React.useState(prefillClientName ?? "");
  const [serviceKey, setServiceKey] = React.useState<string>("coaching_single");
  const [serviceType, setServiceType] = React.useState<string>(
    SERVICES.coaching_single.serviceType
  );
  const [sessionType, setSessionType] = React.useState("");
  const [durationMinutes, setDurationMinutes] = React.useState(60);
  const [locationType, setLocationType] = React.useState<LocationType>("google_meet");
  const [locationDetails, setLocationDetails] = React.useState("");
  const [requiresPayment, setRequiresPayment] = React.useState(false);
  const [amountDollars, setAmountDollars] = React.useState<string>("");
  const [expiresDate, setExpiresDate] = React.useState("");
  const [customMessage, setCustomMessage] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [options, setOptions] = React.useState<OptionRow[]>([
    { id: newId(), date: "", time: "10:00" },
  ]);

  function onServiceKeyChange(value: string) {
    setServiceKey(value);
    if (value && value in SERVICES) {
      const svc = SERVICES[value as ServiceKey];
      setServiceType(svc.serviceType);
      if (!requiresPayment) setAmountDollars((svc.amountCents / 100).toFixed(2));
    }
  }

  function addOption() {
    setOptions((prev) => [...prev, { id: newId(), date: "", time: "10:00" }]);
  }
  function removeOption(id: string) {
    setOptions((prev) => (prev.length === 1 ? prev : prev.filter((o) => o.id !== id)));
  }
  function updateOption(id: string, patch: Partial<Pick<OptionRow, "date" | "time">>) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  const validOptions = options.filter((o) => o.date && o.time);
  const locationPlaceholder =
    LOCATION_OPTIONS.find((l) => l.value === locationType)?.placeholder ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientEmail.trim()) return toast.error("Enter the client's email.");
    if (!serviceType.trim()) return toast.error("Service type is required.");
    if (validOptions.length === 0) return toast.error("Add at least one date and time.");
    if (locationType !== "google_meet" && !locationDetails.trim()) {
      return toast.error("Add the meeting location details.");
    }
    let amountCents: number | null = null;
    if (requiresPayment) {
      const dollars = parseFloat(amountDollars);
      if (!Number.isFinite(dollars) || dollars < 0.5) {
        return toast.error("Set a payment amount of at least $0.50.");
      }
      amountCents = Math.round(dollars * 100);
    }

    const payloadOptions: InvitationOptionInput[] = validOptions.map((o) => ({
      date: o.date,
      time: o.time,
    }));

    setLoading(true);
    const result = await createBookingInvitation({
      clientId: prefillClientId ?? null,
      clientEmail: clientEmail.trim(),
      clientName: clientName.trim() || null,
      serviceType: serviceType.trim(),
      serviceKey: serviceKey || null,
      sessionType: sessionType.trim() || null,
      durationMinutes,
      locationType,
      locationDetails: locationDetails.trim() || null,
      requiresPayment,
      amountCents,
      customMessage: customMessage.trim() || null,
      internalNotes: internalNotes.trim() || null,
      expiresAt: expiresDate ? localCentralToUtcIso(expiresDate, "23:59") : null,
      options: payloadOptions,
      sendNow: true,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation sent to the client.");
    router.push("/admin/invitations");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Client */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-email">Client email <span className="text-red-500">*</span></Label>
          <Input
            id="inv-email"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-name">Client name</Label>
          <Input
            id="inv-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="First Last"
          />
        </div>
      </div>

      {/* Service */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-service">Service</Label>
          <select
            id="inv-service"
            value={serviceKey}
            onChange={(e) => onServiceKeyChange(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Custom service</option>
            {SERVICE_SELECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-service-type">Service type (shown to client) <span className="text-red-500">*</span></Label>
          <Input
            id="inv-service-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-session-type">Session type</Label>
          <Input
            id="inv-session-type"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
            placeholder="e.g. Discovery call, Strategy session"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inv-duration">Session length (minutes) <span className="text-red-500">*</span></Label>
          <Input
            id="inv-duration"
            type="number"
            min={15}
            max={480}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(15, Math.min(480, parseInt(e.target.value, 10) || 60)))}
            required
          />
          <p className="text-xs text-neutral-400">{formatDuration(durationMinutes)}</p>
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="inv-location">Meeting type <span className="text-red-500">*</span></Label>
          <select
            id="inv-location"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
            className={SELECT_CLASS}
          >
            {LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {locationType !== "google_meet" && (
          <div className="space-y-1.5">
            <Label htmlFor="inv-location-details">Location details <span className="text-red-500">*</span></Label>
            <Input
              id="inv-location-details"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              placeholder={locationPlaceholder}
            />
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={requiresPayment}
            onChange={(e) => setRequiresPayment(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-neutral-700">Require payment before booking</span>
        </label>
        {requiresPayment && (
          <div className="space-y-1.5 max-w-[12rem]">
            <Label htmlFor="inv-amount">Amount (USD) <span className="text-red-500">*</span></Label>
            <Input
              id="inv-amount"
              type="number"
              min={0.5}
              step={0.01}
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="125.00"
            />
            <p className="text-xs text-neutral-400">
              Client pays via Stripe Checkout when they pick a time.
            </p>
          </div>
        )}
        {!requiresPayment && (
          <p className="text-xs text-neutral-400">
            Off: the session is created immediately. Track payment manually in the session record.
          </p>
        )}
      </div>

      {/* Time options */}
      <div className="space-y-2">
        <Label>Available date &amp; time options <span className="text-red-500">*</span></Label>
        <p className="text-xs text-neutral-500">
          Offer a few choices. The client picks one — times are Central (CT).
        </p>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              <Input
                type="date"
                value={opt.date}
                min={todayLocal()}
                onChange={(e) => updateOption(opt.id, { date: e.target.value })}
                aria-label={`Option ${idx + 1} date`}
                className="w-44"
              />
              <Input
                type="time"
                value={opt.time}
                onChange={(e) => updateOption(opt.id, { time: e.target.value })}
                aria-label={`Option ${idx + 1} time`}
                className="w-36"
              />
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                disabled={options.length === 1}
                aria-label="Remove option"
                className="ml-1 p-1.5 rounded text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:hover:text-neutral-300 disabled:hover:bg-transparent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline pt-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add another time
        </button>
      </div>

      {/* Expiration + messages */}
      <div className="space-y-1.5 max-w-[14rem]">
        <Label htmlFor="inv-expires">Expires (optional)</Label>
        <Input
          id="inv-expires"
          type="date"
          value={expiresDate}
          min={todayLocal()}
          onChange={(e) => setExpiresDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inv-message">Custom message (shown in the email)</Label>
        <textarea
          id="inv-message"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          placeholder="A personal note to the client…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inv-internal">Internal notes (admin only)</Label>
        <textarea
          id="inv-internal"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          placeholder="Notes only you can see…"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send Booking Options"}
        </Button>
        <span className="text-xs text-neutral-400">
          {validOptions.length} time{validOptions.length === 1 ? "" : "s"} offered
        </span>
      </div>
    </form>
  );
}
