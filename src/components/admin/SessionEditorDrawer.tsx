"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Save, CalendarClock, UserCog, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOCATION_TYPE_LABELS } from "@/lib/booking/display";
import {
  adminUpdateSession,
  adminReassignClient,
  cancelSession,
  adminDeleteSession,
} from "@/app/actions/sessions";

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const TEXTAREA_CLASS =
  "flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

// "cancelled" is intentionally not here — cancelling routes through the Cancel
// button so the calendar event is removed and any package credit returned.
const STATUS_OPTIONS = [
  { value: "intake_needed", label: "Intake needed" },
  { value: "intake_complete", label: "Intake complete" },
  { value: "session_scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "follow_up_sent", label: "Follow-up sent" },
  { value: "no_show", label: "No show" },
  { value: "rescheduled", label: "Rescheduled" },
];
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

export interface ClientOption {
  id: string;
  name: string;
  email: string;
}

export interface SessionEditorBooking {
  id: string;
  clientId: string | null;
  serviceType: string;
  sessionType: string | null;
  sessionAt: string | null;
  durationMinutes: number;
  locationType: string;
  locationDetails: string | null;
  meetLink: string | null;
  paymentStatus: string;
  workflowStatus: string;
  amountCents: number | null;
  adminNotes: string | null;
  /** No-account session contact (client_id null). Omitted for account rows. */
  guestName?: string | null;
  guestEmail?: string | null;
}

/** Split a UTC ISO moment into Central `date` + `time` input values. */
function centralParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

function dollarsFromCents(cents: number | null): string {
  if (cents == null) return "";
  return Number.isInteger(cents / 100) ? String(cents / 100) : (cents / 100).toFixed(2);
}

function centsFromDollars(dollars: string): number | null {
  const t = dollars.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

function locationPlaceholder(type: string): string {
  if (type === "phone") return "Phone number";
  if (type === "in_person") return "Address";
  if (type === "custom") return "Instructions for the client";
  return "Added automatically (or set a Meet link below)";
}

interface Props {
  booking: SessionEditorBooking;
  /** When provided (and the session is upcoming), a reassign control appears. */
  clients?: ClientOption[];
  triggerLabel?: string;
  triggerClassName?: string;
}

export function SessionEditorDrawer({
  booking,
  clients,
  triggerLabel = "Edit",
  triggerClassName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const initialParts = centralParts(booking.sessionAt);

  const [serviceType, setServiceType] = React.useState(booking.serviceType);
  const [sessionType, setSessionType] = React.useState(booking.sessionType ?? "");
  const [rDate, setRDate] = React.useState(initialParts.date);
  const [rTime, setRTime] = React.useState(initialParts.time);
  const [duration, setDuration] = React.useState(String(booking.durationMinutes));
  const [locationType, setLocationType] = React.useState(booking.locationType);
  const [locationDetails, setLocationDetails] = React.useState(booking.locationDetails ?? "");
  const [meetLink, setMeetLink] = React.useState(booking.meetLink ?? "");
  const [paymentStatus, setPaymentStatus] = React.useState(booking.paymentStatus);
  const [workflowStatus, setWorkflowStatus] = React.useState(booking.workflowStatus);
  const [amount, setAmount] = React.useState(dollarsFromCents(booking.amountCents));
  const [adminNotes, setAdminNotes] = React.useState(booking.adminNotes ?? "");
  const [notifyReschedule, setNotifyReschedule] = React.useState(false);

  const [reassignTo, setReassignTo] = React.useState("");
  const [notifyCancel, setNotifyCancel] = React.useState(false);
  const [deleteText, setDeleteText] = React.useState("");

  // Computed after mount (reading the clock during render is impure).
  const [isFuture, setIsFuture] = React.useState(false);
  React.useEffect(() => {
    setIsFuture(!!booking.sessionAt && new Date(booking.sessionAt).getTime() > Date.now());
  }, [booking.sessionAt]);
  const canReassign = !!clients && isFuture && booking.workflowStatus !== "cancelled";
  const reassignTargets = (clients ?? []).filter((c) => c.id !== booking.clientId);

  // No-account session: no linked profile. Show the typed guest contact so the
  // drawer doesn't read as an "Unknown client".
  const noAccount = !booking.clientId;
  const guestLabel = booking.guestName || booking.guestEmail || "Unknown client";

  const isCancelled = booking.workflowStatus === "cancelled";
  // Cancelling routes through the Cancel button, so "Cancelled" isn't a normal
  // status choice — but a cancelled row must still render its current status, so
  // surface the option only when the row is already cancelled.
  const statusOptions = isCancelled
    ? [...STATUS_OPTIONS, { value: "cancelled", label: "Cancelled" }]
    : STATUS_OPTIONS;

  async function del() {
    setBusy(true);
    const res = await adminDeleteSession(booking.id, deleteText);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session deleted.");
    setOpen(false);
    router.refresh();
  }

  async function save() {
    const patch: Parameters<typeof adminUpdateSession>[1] = {};

    if (serviceType.trim() !== booking.serviceType) patch.serviceType = serviceType.trim();
    if ((sessionType.trim() || null) !== (booking.sessionType ?? null)) {
      patch.sessionType = sessionType.trim() || null;
    }
    const durationNum = Number(duration);
    if (durationNum !== booking.durationMinutes) patch.durationMinutes = durationNum;
    if (locationType !== booking.locationType) patch.locationType = locationType;
    if ((locationDetails.trim() || null) !== (booking.locationDetails ?? null)) {
      patch.locationDetails = locationDetails.trim() || null;
    }
    if ((meetLink.trim() || null) !== (booking.meetLink ?? null)) {
      patch.meetLink = meetLink.trim() || null;
    }
    if (paymentStatus !== booking.paymentStatus) patch.paymentStatus = paymentStatus;
    if (workflowStatus !== booking.workflowStatus) patch.workflowStatus = workflowStatus;

    const amountCents = centsFromDollars(amount);
    if (Number.isNaN(amountCents)) return toast.error("Enter a valid amount.");
    if (amountCents !== booking.amountCents) patch.amountCents = amountCents;

    if ((adminNotes.trim() || null) !== (booking.adminNotes ?? null)) {
      patch.adminNotes = adminNotes.trim() || null;
    }

    // Time change (only when the admin actually moved it).
    if (rDate !== initialParts.date || rTime !== initialParts.time) {
      if (!rDate || !rTime) return toast.error("Pick a valid date and time.");
      patch.dateCentral = rDate;
      patch.timeCentral = rTime;
      patch.notifyClient = notifyReschedule;
    }

    if (Object.keys(patch).length === 0) {
      toast.info("Nothing changed.");
      return;
    }

    setBusy(true);
    const res = await adminUpdateSession(booking.id, patch);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session updated.");
    setOpen(false);
    router.refresh();
  }

  async function reassign() {
    if (!reassignTo) return toast.error("Pick a client.");
    setBusy(true);
    const res = await adminReassignClient(booking.id, reassignTo);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Session reassigned.");
    setOpen(false);
    router.refresh();
  }

  async function cancel() {
    if (!confirm("Cancel this session? The calendar event is removed.")) return;
    setBusy(true);
    const res = await cancelSession(booking.id, { notifyClient: notifyCancel });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(notifyCancel ? "Session cancelled and client emailed." : "Session cancelled.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand-700",
            triggerClassName
          )}
        >
          <Pencil className="h-3.5 w-3.5" /> {triggerLabel}
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
              Edit session
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-neutral-400 hover:text-neutral-600" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Edit this session&apos;s details, reschedule, reassign, or cancel it.
          </Dialog.Description>

          {noAccount && (
            <div className="-mt-3 mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-neutral-700 truncate">{guestLabel}</span>
              <span className="text-[10px] uppercase tracking-wide bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-semibold">
                No account
              </span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value)} className={SELECT_CLASS}>
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment</Label>
                <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={SELECT_CLASS}>
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Service</Label>
              <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Session type (optional)</Label>
              <Input value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="h-9" placeholder="e.g. Discovery call" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> Date (CT)</Label>
                <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time (CT)</Label>
                <Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-9" />
              </div>
            </div>

            {(rDate !== initialParts.date || rTime !== initialParts.time) && (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyReschedule}
                  onChange={(e) => setNotifyReschedule(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-neutral-700">Email the client about the new time</span>
              </label>
            )}

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
                <Label className="text-xs">Location details</Label>
                <Input value={locationDetails} onChange={(e) => setLocationDetails(e.target.value)} className="h-9" placeholder={locationPlaceholder(locationType)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Meeting link (optional)</Label>
                <Input value={meetLink} onChange={(e) => setMeetLink(e.target.value)} className="h-9" placeholder="https://meet.google.com/..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount (USD)</Label>
                <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" placeholder="0" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Admin notes (private)</Label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className={TEXTAREA_CLASS} />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="button" onClick={save} disabled={busy} className="h-9">
                <Save className="h-4 w-4 mr-1.5" /> Save changes
              </Button>
            </div>
          </div>

          {/* Reassign */}
          {canReassign && (
            <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> Reassign to another client</Label>
              <div className="flex items-center gap-2">
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={SELECT_CLASS}>
                  <option value="">Choose a client…</option>
                  {reassignTargets.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ? `${c.name} (${c.email})` : c.email}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={reassign}
                  disabled={busy || !reassignTo}
                  className="inline-flex items-center h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 hover:border-brand-300 disabled:opacity-40 flex-shrink-0"
                >
                  Reassign
                </button>
              </div>
            </div>
          )}

          {/* Cancel — hidden once a session is already cancelled. */}
          {!isCancelled && (
            <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyCancel}
                  onChange={(e) => setNotifyCancel(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-neutral-700">Email the client when cancelling</span>
              </label>
              <div>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                >
                  Cancel session
                </button>
              </div>
            </div>
          )}

          {/* Danger zone — permanent delete (test/duplicate rows only) */}
          <div className="mt-5 pt-4 border-t border-neutral-200 space-y-2">
            <p className="text-xs font-semibold text-red-700">Danger zone</p>
            <p className="text-xs text-neutral-500">
              Permanently delete this session. For test or duplicate rows only. This can&apos;t be
              undone. Type DELETE to confirm.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="h-9 w-40"
                placeholder="DELETE"
              />
              <button
                type="button"
                onClick={del}
                disabled={busy || deleteText !== "DELETE"}
                className="inline-flex items-center h-9 px-3 rounded-md bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete session
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
