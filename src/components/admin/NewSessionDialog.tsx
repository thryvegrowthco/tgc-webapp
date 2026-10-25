"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOCATION_TYPE_LABELS } from "@/lib/booking/display";
import { adminCreateSession } from "@/app/actions/sessions";
import type { ClientOption } from "@/components/admin/SessionEditorDrawer";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

const PAYMENT_OPTIONS = [
  { value: "not_required", label: "Not required" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
  { value: "waived", label: "Waived" },
];
const LOCATION_OPTIONS = (Object.keys(LOCATION_TYPE_LABELS) as Array<keyof typeof LOCATION_TYPE_LABELS>).map(
  (value) => ({ value, label: LOCATION_TYPE_LABELS[value] })
);

export interface ServicePreset {
  key: string;
  label: string;
  serviceType: string;
  amountCents: number;
}

interface Props {
  clients: ClientOption[];
  servicePresets: ServicePreset[];
  /** Preselect a client (e.g. opened from a client's detail page). */
  defaultClientId?: string;
}

function centsFromDollars(dollars: string): number | null {
  const t = dollars.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

export function NewSessionDialog({ clients, servicePresets, defaultClientId }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [clientMode, setClientMode] = React.useState<"existing" | "new">(
    clients.length > 0 ? "existing" : "new"
  );
  const [clientId, setClientId] = React.useState(defaultClientId ?? "");
  const [newEmail, setNewEmail] = React.useState("");
  const [newName, setNewName] = React.useState("");

  const [serviceKey, setServiceKey] = React.useState<string>(servicePresets[0]?.key ?? "");
  const [customService, setCustomService] = React.useState("");
  const [sessionType, setSessionType] = React.useState("");

  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [duration, setDuration] = React.useState("60");

  const [locationType, setLocationType] = React.useState<string>("google_meet");
  const [locationDetails, setLocationDetails] = React.useState("");

  const [paymentStatus, setPaymentStatus] = React.useState("not_required");
  const [amount, setAmount] = React.useState(() =>
    servicePresets[0] ? String(servicePresets[0].amountCents / 100) : ""
  );
  const [adminNotes, setAdminNotes] = React.useState("");
  const [sendConfirmation, setSendConfirmation] = React.useState(false);

  function pickService(key: string) {
    setServiceKey(key);
    const preset = servicePresets.find((p) => p.key === key);
    if (preset) setAmount(String(preset.amountCents / 100));
  }

  async function create() {
    const serviceType = serviceKey
      ? servicePresets.find((p) => p.key === serviceKey)?.serviceType ?? ""
      : customService.trim();
    if (!serviceType) return toast.error("Pick or enter a service.");
    if (!date || !time) return toast.error("Pick a date and time.");

    const amountCents = centsFromDollars(amount);
    if (Number.isNaN(amountCents)) return toast.error("Enter a valid amount.");

    const usingExisting = clientMode === "existing";
    if (usingExisting && !clientId) return toast.error("Pick a client.");
    if (!usingExisting && !newEmail.trim()) return toast.error("Enter the client's email.");
    if (!usingExisting && !newName.trim()) return toast.error("Enter the client's name.");

    setBusy(true);
    const res = await adminCreateSession({
      clientId: usingExisting ? clientId : null,
      clientEmail: usingExisting ? undefined : newEmail.trim(),
      clientName: usingExisting ? undefined : newName.trim(),
      serviceType,
      serviceKey: serviceKey || null,
      sessionType: sessionType.trim() || null,
      dateCentral: date,
      timeCentral: time,
      durationMinutes: Number(duration),
      locationType,
      locationDetails: locationDetails.trim() || null,
      paymentStatus,
      amountCents,
      adminNotes: adminNotes.trim() || null,
      sendConfirmation,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(sendConfirmation ? "Session created and client emailed." : "Session created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> New session
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <Dialog.Title className="font-display font-bold text-neutral-900 text-lg">
              New session
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-neutral-400 hover:text-neutral-600" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Create a session for a client without taking a payment.
          </Dialog.Description>

          <div className="space-y-4">
            {/* Client */}
            <div className="space-y-2">
              <Label className="text-xs">Client</Label>
              {clients.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={clientMode === "existing"} onChange={() => setClientMode("existing")} className="text-brand-500 focus:ring-brand-500" />
                    Existing client
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={clientMode === "new"} onChange={() => setClientMode("new")} className="text-brand-500 focus:ring-brand-500" />
                    No account
                  </label>
                </div>
              )}
              {clientMode === "existing" ? (
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={SELECT_CLASS}>
                  <option value="">Choose a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ? `${c.name} (${c.email})` : c.email}</option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" placeholder="Full name" />
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-9" placeholder="email@example.com" />
                </div>
              )}
            </div>

            {/* Service */}
            <div className="space-y-1">
              <Label className="text-xs">Service</Label>
              <select value={serviceKey} onChange={(e) => pickService(e.target.value)} className={SELECT_CLASS}>
                {servicePresets.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
                <option value="">Custom / other…</option>
              </select>
              {!serviceKey && (
                <Input value={customService} onChange={(e) => setCustomService(e.target.value)} className="h-9 mt-2" placeholder="Service name" />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Session type (optional)</Label>
              <Input value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="h-9" placeholder="e.g. Discovery call" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date (CT)</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time (CT)</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Meeting type</Label>
                <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={SELECT_CLASS}>
                  {LOCATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location details (optional)</Label>
                <Input value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payment</Label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={SELECT_CLASS}>
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" placeholder="0" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Admin notes (private, optional)</Label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className={TEXTAREA_CLASS} />
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-neutral-200 p-3">
              <input
                type="checkbox"
                checked={sendConfirmation}
                onChange={(e) => setSendConfirmation(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm">
                <span className="font-medium text-neutral-900">Email the client a confirmation</span>
                <span className="text-neutral-500 block mt-0.5">
                  Off by default. Leave this off to add the session quietly.
                </span>
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={create} disabled={busy}>
                {busy ? "Creating…" : "Create session"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
